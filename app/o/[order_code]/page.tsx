import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLangFromCookie } from "@/lib/i18n-server";
import { StallQuickPay } from "@/components/buyer/stall-quick-pay";

type OrderRow = {
  id: string;
  order_code: string;
  status: "pending_payment" | "proof_submitted" | "paid" | "cancelled";
  subtotal_cents: number;
  created_at: string;
  paid_at: string | null;
  shops: { shop_name: string; slug: string; payment_qr_url: string | null } | null;
};

type ItemRow = {
  id: string;
  product_id: string;
  qty: number;
  line_total_cents: number;
  products: { name: string } | { name: string }[] | null;
};

export default async function OrderCodePage({ params }: { params: Promise<{ order_code: string }> }) {
  const lang = await getLangFromCookie();
  const { order_code } = await params;
  const admin = createAdminClient();

  const { data: orderData } = await admin
    .from("orders")
    .select("id,order_code,status,subtotal_cents,created_at,paid_at,shops(shop_name,slug,payment_qr_url)")
    .eq("order_code", order_code)
    .maybeSingle();

  const order = orderData as OrderRow | null;

  if (!order || !order.shops) {
    notFound();
  }

  const { data: itemsData } = await admin
    .from("order_items")
    .select("id,product_id,qty,line_total_cents,products(name)")
    .eq("order_id", order.id)
    .order("id", { ascending: true });

  const items = ((itemsData ?? []) as ItemRow[]).map((item) => ({
    id: item.id,
    product_id: item.product_id,
    qty: item.qty,
    line_total_cents: item.line_total_cents,
    product_name: Array.isArray(item.products) ? item.products[0]?.name ?? "Product" : item.products?.name ?? "Product",
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_16%,rgba(0,194,168,0.08),transparent_42%),radial-gradient(circle_at_82%_18%,rgba(201,162,39,0.08),transparent_40%),#0B1F1A] pb-24">
      <StallQuickPay
        lang={lang}
        orderCode={order.order_code}
        status={order.status}
        subtotalCents={order.subtotal_cents}
        shopName={order.shops.shop_name}
        shopSlug={order.shops.slug}
        paymentQrUrl={order.shops.payment_qr_url}
        items={items}
        paidAt={order.paid_at}
      />
    </main>
  );
}
