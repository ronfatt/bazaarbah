import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { OrderActions } from "@/components/dashboard/order-actions";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents } from "@/lib/utils";

type ItemJoin = {
  id: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  products: { name: string } | { name: string }[];
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const shopIds = shops?.map((s) => s.id) ?? [];

  const { data: order } = await admin
    .from("orders")
    .select("id,order_code,status,buyer_name,buyer_phone,subtotal_cents,created_at")
    .eq("id", id)
    .in("shop_id", shopIds)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const { data: items } = await admin
    .from("order_items")
    .select("id,qty,unit_price_cents,line_total_cents,products(name)")
    .eq("order_id", order.id);

  const { data: payments } = await admin
    .from("payments")
    .select("id,reference_text,proof_image_url,submitted_at,confirmed_at")
    .eq("order_id", order.id)
    .order("submitted_at", { ascending: false });

  const { data: receipt } = await admin.from("receipts").select("receipt_no,issued_at").eq("order_id", order.id).maybeSingle();

  return (
    <section className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{order.order_code}</h1>
            <p className="mt-1 text-sm text-neutral-600">Status: {order.status}</p>
          </div>
          <Link href="/dashboard/orders" className="text-sm font-semibold text-amber-700">
            Back
          </Link>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-neutral-700 md:grid-cols-2">
          <p>Buyer: {order.buyer_name ?? "Guest"}</p>
          <p>Phone: {order.buyer_phone ?? "-"}</p>
          <p>Total: {currencyFromCents(order.subtotal_cents)}</p>
          <p>Created: {new Date(order.created_at).toLocaleString("en-MY")}</p>
        </div>

        <div className="mt-5">
          <OrderActions orderId={order.id} canMarkPaid={order.status !== "paid"} />
        </div>

        {receipt && <p className="mt-4 text-sm text-emerald-700">Receipt: {receipt.receipt_no}</p>}
      </Card>

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
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Payment Proofs</h2>
        <div className="mt-3 space-y-3 text-sm">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-neutral-200 p-3">
              <p>Reference: {p.reference_text ?? "-"}</p>
              <p>Submitted: {new Date(p.submitted_at).toLocaleString("en-MY")}</p>
              <p>Confirmed: {p.confirmed_at ? new Date(p.confirmed_at).toLocaleString("en-MY") : "No"}</p>
              {p.proof_image_url && (
                <a href={p.proof_image_url} className="text-amber-700" target="_blank" rel="noreferrer">
                  Open proof image
                </a>
              )}
            </div>
          ))}
          {payments?.length === 0 && <p className="text-neutral-500">No payment proof submitted yet.</p>}
        </div>
      </Card>
    </section>
  );
}
