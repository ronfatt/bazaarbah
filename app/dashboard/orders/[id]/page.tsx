import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { OrderActions } from "@/components/dashboard/order-actions";
import { requireUnlockedSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

type ItemJoin = {
  id: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  products: { name: string } | { name: string }[];
};

function statusClass(status: string) {
  if (status === "paid") return "bg-green-500/10 text-green-400";
  if (status === "cancelled") return "bg-red-500/10 text-red-400";
  return "bg-yellow-500/10 text-yellow-400";
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const lang = await getLangFromCookie();
  const { id } = await params;
  const { user } = await requireUnlockedSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const shopIds = shops?.map((s) => s.id) ?? [];

  const { data: order } = await admin
    .from("orders")
    .select("id,order_code,status,buyer_name,buyer_phone,subtotal_cents,created_at")
    .eq("id", id)
    .in("shop_id", shopIds)
    .maybeSingle();

  if (!order) notFound();

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
            <h1 className="text-2xl font-bold text-[#F3F4F6]">{order.order_code}</h1>
            <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass(order.status)}`}>{order.status}</span>
          </div>
          <Link href="/dashboard/orders" className="text-sm font-semibold text-[#C9A227]">
            {t(lang, "common.back")}
          </Link>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-[#9CA3AF] md:grid-cols-2">
          <p>{t(lang, "dashboard.buyer")}: {order.buyer_name ?? t(lang, "common.guest")}</p>
          <p>Phone: {order.buyer_phone ?? "-"}</p>
          <p>{t(lang, "buyer.total")} {currencyFromCents(order.subtotal_cents)}</p>
          <p>Created: {new Date(order.created_at).toLocaleString("en-MY")}</p>
        </div>

        <div className="mt-5">
          <OrderActions orderId={order.id} canMarkPaid={order.status !== "paid"} lang={lang} />
        </div>

        {receipt && <p className="mt-4 text-sm text-emerald-400">Receipt: {receipt.receipt_no}</p>}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-[#F3F4F6]">{t(lang, "buyer.items")}</h2>
        <div className="mt-3 space-y-2 text-sm text-[#F3F4F6]">
          {(items as ItemJoin[] | null)?.map((item) => {
            const raw = item.products;
            const name = Array.isArray(raw) ? raw[0]?.name : raw?.name;
            return (
              <div key={item.id} className="flex justify-between border-b border-white/5 py-2">
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
        <h2 className="text-lg font-semibold text-[#F3F4F6]">{t(lang, "buyer.submit_proof")}</h2>
        <div className="mt-3 space-y-3 text-sm text-[#F3F4F6]">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p>{t(lang, "buyer.reference_text")}: {p.reference_text ?? "-"}</p>
              <p>Submitted: {new Date(p.submitted_at).toLocaleString("en-MY")}</p>
              <p>Confirmed: {p.confirmed_at ? new Date(p.confirmed_at).toLocaleString("en-MY") : "No"}</p>
              {p.proof_image_url && (
                <a href={p.proof_image_url} className="text-[#C9A227]" target="_blank" rel="noreferrer">
                  Open proof image
                </a>
              )}
            </div>
          ))}
          {payments?.length === 0 && <p className="text-[#9CA3AF]">-</p>}
        </div>
      </Card>
    </section>
  );
}
