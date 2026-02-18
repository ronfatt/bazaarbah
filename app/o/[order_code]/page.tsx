import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents } from "@/lib/utils";
import { PaymentProofForm } from "@/components/buyer/payment-proof-form";

type ItemJoin = {
  id: string;
  qty: number;
  line_total_cents: number;
  products: { name: string } | { name: string }[];
};

export default async function OrderCodePage({ params }: { params: Promise<{ order_code: string }> }) {
  const { order_code } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id,order_code,status,subtotal_cents,created_at,shops(shop_name)")
    .eq("order_code", order_code)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const { data: items } = await admin.from("order_items").select("id,qty,line_total_cents,products(name)").eq("order_id", order.id);
  const { data: payments } = await admin.from("payments").select("id,submitted_at").eq("order_id", order.id);

  const shopRaw = order.shops as { shop_name: string } | { shop_name: string }[] | null;
  const shopName = Array.isArray(shopRaw) ? shopRaw[0]?.shop_name : shopRaw?.shop_name;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 md:px-10">
      <Card>
        <h1 className="text-2xl font-bold">Order {order.order_code}</h1>
        <p className="mt-1 text-sm text-neutral-600">Shop: {shopName ?? "Raya Shop"}</p>
        <p className="mt-1 text-sm text-neutral-600">Status: {order.status}</p>
        <p className="mt-1 text-sm font-semibold">Amount: {currencyFromCents(order.subtotal_cents)}</p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-800">Manual QR Payment</p>
          <p className="text-amber-700">Scan seller QR and submit your reference/proof below.</p>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(items as ItemJoin[] | null)?.map((item) => {
              const raw = item.products;
              const name = Array.isArray(raw) ? raw[0]?.name : raw?.name;
              return (
                <div key={item.id} className="flex justify-between border-b border-neutral-100 py-2">
                  <span>
                    {name} x {item.qty}
                  </span>
                  <span>{currencyFromCents(item.line_total_cents)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-neutral-500">Proof submissions: {payments?.length ?? 0}</p>
        </Card>

        <PaymentProofForm orderCode={order.order_code} />
      </div>
    </main>
  );
}
