import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyStockDeltas, ensureCanPurchase, loadStockProducts, rollbackStockDeltas } from "@/lib/stock";

const schema = z.object({
  shopSlug: z.string().min(2),
  buyerName: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().min(2).optional()),
  buyerPhone: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().min(6).optional()),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(99) })).min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderCode: string }> }) {
  const { orderCode } = await params;
  try {
    const body = schema.parse(await req.json());
    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("id,shop_id,status")
      .eq("order_code", orderCode)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!["pending_payment", "proof_submitted"].includes(order.status)) {
      return NextResponse.json({ error: "Order cannot be edited after payment." }, { status: 400 });
    }

    const { data: shop } = await admin.from("shops").select("id").eq("id", order.shop_id).eq("slug", body.shopSlug).maybeSingle();
    if (!shop) return NextResponse.json({ error: "Shop mismatch" }, { status: 400 });

    const { data: currentItems } = await admin.from("order_items").select("product_id,qty").eq("order_id", order.id);
    const currentQtyByProduct = new Map<string, number>();
    for (const item of currentItems ?? []) {
      currentQtyByProduct.set(item.product_id, Number(item.qty ?? 0));
    }

    const productIds = [...new Set([...body.items.map((i) => i.productId), ...currentQtyByProduct.keys()])];
    const products = await loadStockProducts(admin, order.shop_id, productIds);
    if (!products.size) return NextResponse.json({ error: "Products not found" }, { status: 404 });

    ensureCanPurchase(
      products,
      body.items.map((item) => {
        const currentQty = currentQtyByProduct.get(item.productId) ?? 0;
        return { productId: item.productId, qty: Math.max(0, item.qty - currentQty) };
      }).filter((item) => item.qty > 0),
    );

    let subtotal = 0;
    const nextItems = body.items.map((item) => {
      const product = products.get(item.productId);
      if (!product) {
        throw new Error("Invalid product in cart");
      }
      const lineTotal = product.price_cents * item.qty;
      subtotal += lineTotal;
      return {
        order_id: order.id,
        product_id: item.productId,
        qty: item.qty,
        unit_price_cents: product.price_cents,
        line_total_cents: lineTotal,
      };
    });

    const nextQtyByProduct = new Map(body.items.map((item) => [item.productId, item.qty]));
    const deltas = productIds.map((productId) => ({
      productId,
      delta: (currentQtyByProduct.get(productId) ?? 0) - (nextQtyByProduct.get(productId) ?? 0),
    }));

    const appliedStock = await applyStockDeltas(admin, products, deltas);

    const { error: deleteErr } = await admin.from("order_items").delete().eq("order_id", order.id);
    if (deleteErr) {
      await rollbackStockDeltas(admin, products, appliedStock);
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }
    const { error: insertErr } = await admin.from("order_items").insert(nextItems);
    if (insertErr) {
      await rollbackStockDeltas(admin, products, appliedStock);
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    const { error: orderUpdateErr } = await admin
      .from("orders")
      .update({
        subtotal_cents: subtotal,
        buyer_name: body.buyerName ?? null,
        buyer_phone: body.buyerPhone ?? null,
        status: "pending_payment",
      })
      .eq("id", order.id);
    if (orderUpdateErr) {
      await rollbackStockDeltas(admin, products, appliedStock);
      return NextResponse.json({ error: orderUpdateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, orderCode });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }
}
