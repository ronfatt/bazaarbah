import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReceiptPdf } from "@/lib/receipt";
import { generateReceiptNo } from "@/lib/utils";

type ItemJoin = {
  qty: number;
  products: { name: string } | { name: string }[];
};

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: ownShops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const ownShopIds = ownShops?.map((s) => s.id) ?? [];

  const { data: order } = await admin.from("orders").select("id").eq("id", id).in("shop_id", ownShopIds).maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { count } = await admin.from("receipts").select("id", { count: "exact", head: true });
  const receiptNo = generateReceiptNo((count ?? 0) + 1);

  const { data, error } = await admin
    .from("receipts")
    .insert({ order_id: order.id, receipt_no: receiptNo, pdf_url: `inline:/api/orders/${order.id}/receipt` })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ receipt: data });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id,order_code,buyer_name,subtotal_cents,created_at,shops(shop_name)")
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: items } = await admin.from("order_items").select("qty,products(name)").eq("order_id", id);
  const qty = (items as ItemJoin[] | null)?.reduce((acc, cur) => acc + cur.qty, 0) ?? 0;

  const first = (items?.[0] as ItemJoin | undefined)?.products;
  const productName = Array.isArray(first) ? first[0]?.name : first?.name;

  const shopRaw = order.shops as { shop_name: string } | { shop_name: string }[] | null;
  const shopName = Array.isArray(shopRaw) ? shopRaw[0]?.shop_name : shopRaw?.shop_name;

  const pdfBytes = await buildReceiptPdf({
    orderId: order.order_code,
    storeName: shopName ?? "Raya Shop",
    buyerName: order.buyer_name ?? "Walk-in Buyer",
    productName: productName ?? `${items?.length ?? 0} item(s)`,
    qty,
    totalCents: order.subtotal_cents,
    createdAt: order.created_at,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${order.order_code}.pdf"`,
    },
  });
}
