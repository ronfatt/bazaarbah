import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireUnlockedSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

const statuses = ["all", "pending_payment", "proof_submitted", "paid", "cancelled"] as const;

function statusClass(status: string) {
  if (status === "paid") return "bg-green-500/10 text-green-400";
  if (status === "cancelled") return "bg-red-500/10 text-red-400";
  if (status === "pending_payment" || status === "proof_submitted") return "bg-yellow-500/10 text-yellow-400";
  return "bg-white/10 text-[#9CA3AF]";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const lang = await getLangFromCookie();
  const { status } = await searchParams;
  const selected = statuses.includes((status as (typeof statuses)[number]) ?? "all") ? (status as string) : "all";

  const { user } = await requireUnlockedSeller();
  const admin = createAdminClient();

  const query = admin
    .from("orders")
    .select("id,order_code,buyer_name,buyer_phone,status,subtotal_cents,created_at,shops!inner(owner_id)")
    .eq("shops.owner_id", user.id)
    .order("created_at", { ascending: false });

  if (selected !== "all") {
    query.eq("status", selected);
  }

  const { data: orders } = await query;

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold text-[#F3F4F6]">{t(lang, "orders.title")}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${s}`}
              className={`rounded-lg px-3 py-1 text-sm ${selected === s ? "bg-[#163C33] border border-[#C9A227] text-[#F3F4F6]" : "bg-[#163C33] text-[#9CA3AF] border border-white/10"}`}
            >
              {s}
            </Link>
          ))}
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#112E27]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 bg-[#163C33] text-[#9CA3AF]">
            <tr>
              <th className="px-4 py-3">{t(lang, "orders.order_code")}</th>
              <th className="px-4 py-3">{t(lang, "dashboard.buyer")}</th>
              <th className="px-4 py-3">{t(lang, "dashboard.status")}</th>
              <th className="px-4 py-3">{t(lang, "orders.subtotal")}</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-white/5 text-[#F3F4F6] hover:bg-[#163C33]">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/dashboard/orders/${o.id}`} className="text-[#C9A227]">
                    {o.order_code}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.buyer_name ?? t(lang, "common.guest")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(o.status)}`}>{o.status}</span>
                </td>
                <td className="px-4 py-3">{currencyFromCents(o.subtotal_cents)}</td>
              </tr>
            ))}
            {(orders?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#9CA3AF]">
                  {t(lang, "orders.no_orders")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
