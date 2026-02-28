import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderCode } from "@/lib/utils";
import { applyStockDeltas, ensureCanPurchase, loadStockProducts, rollbackStockDeltas } from "@/lib/stock";

const orderSchema = z.object({
  shopId: z.string().uuid().optional(),
  shopSlug: z.string().min(2).optional(),
  buyerName: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().min(2).optional()),
  buyerPhone: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().min(6).optional()),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(99) })).min(1),
});

async function insertOrderWithRetry(admin: ReturnType<typeof createAdminClient>, payload: {
  shopId: string;
  buyerName?: string;
  buyerPhone?: string;
  subtotal: number;
}) {
  for (let i = 0; i < 5; i++) {
    const code = generateOrderCode();
    const { data, error } = await admin
      .from("orders")
      .insert({
        order_code: code,
        shop_id: payload.shopId,
        buyer_name: payload.buyerName ?? null,
        buyer_phone: payload.buyerPhone ?? null,
        subtotal_cents: payload.subtotal,
      })
      .select("id,order_code,status,subtotal_cents")
      .single();

    if (!error && data) return { data, error: null };
    if (!error?.message?.toLowerCase().includes("duplicate") && !error?.message?.toLowerCase().includes("unique")) {
      return { data: null, error };
    }
  }

  return { data: null, error: { message: "Could not generate unique order code" } };
}

export async function POST(req: NextRequest) {
  try {
    const payload = orderSchema.parse(await req.json());
    const admin = createAdminClient();

    let shopId = payload.shopId;
    if (!shopId && payload.shopSlug) {
      const { data: shop } = await admin.from("shops").select("id").eq("slug", payload.shopSlug).eq("is_active", true).maybeSingle();
      shopId = shop?.id;
    }

    if (!shopId) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const productIds = payload.items.map((i) => i.productId);
    const products = await loadStockProducts(admin, shopId, productIds);
    if (!products.size) {
      return NextResponse.json({ error: "Products not found" }, { status: 404 });
    }
    ensureCanPurchase(products, payload.items);
    let subtotal = 0;
    const orderItems = payload.items.map((item) => {
      const product = products.get(item.productId);
      if (!product) {
        throw new Error("Invalid product in cart");
      }

      const line = product.price_cents * item.qty;
      subtotal += line;
      return {
        product_id: item.productId,
        qty: item.qty,
        unit_price_cents: product.price_cents,
        line_total_cents: line,
      };
    });

    const appliedStock = await applyStockDeltas(
      admin,
      products,
      payload.items.map((item) => ({ productId: item.productId, delta: -item.qty })),
    );

    const { data: order, error: orderErr } = await insertOrderWithRetry(admin, {
      shopId,
      buyerName: payload.buyerName,
      buyerPhone: payload.buyerPhone,
      subtotal,
    });

    if (orderErr || !order) {
      await rollbackStockDeltas(admin, products, appliedStock);
      return NextResponse.json({ error: orderErr?.message ?? "Order failed" }, { status: 400 });
    }

    const itemsPayload = orderItems.map((item) => ({ ...item, order_id: order.id }));
    const { error: itemsErr } = await admin.from("order_items").insert(itemsPayload);

    if (itemsErr) {
      await rollbackStockDeltas(admin, products, appliedStock);
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsErr.message }, { status: 400 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }
}
