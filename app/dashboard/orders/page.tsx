import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";
import { filterOrdersByQuery, loadOrderItemSummaries, loadSellerOrders, orderPaymentStatusLabel, ORDER_STATUSES, type OrderStatusFilter } from "@/lib/orders";

function statusClass(status: string) {
  if (status === "paid") return "bg-green-500/10 text-green-400";
  if (status === "cancelled") return "bg-red-500/10 text-red-400";
  if (status === "pending_payment" || status === "proof_submitted") return "bg-yellow-500/10 text-yellow-400";
  return "bg-white/10 text-[#9CA3AF]";
}

function toYmd(date: Date) {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function buildOrderQuery(params: Record<string, string | undefined>) {
  const cleanParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) cleanParams[key] = value;
  }
  const search = new URLSearchParams(cleanParams);
  const query = search.toString();
  return query ? `/dashboard/orders?${query}` : "/dashboard/orders";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const lang = await getLangFromCookie();
  const { status, q, dateFrom, dateTo } = (await searchParams) as { status?: string; q?: string; dateFrom?: string; dateTo?: string };
  const selected: OrderStatusFilter = ORDER_STATUSES.includes((status ?? "all") as OrderStatusFilter) ? ((status ?? "all") as OrderStatusFilter) : "all";

  const { user } = await requireSeller();
  const admin = createAdminClient();
  const { orders, loadError } = await loadSellerOrders(admin, user.id, { status: selected, dateFrom, dateTo });
  const filteredOrders = filterOrdersByQuery(orders, q);

  const orderIds = filteredOrders.map((o) => o.id);
  const itemSummaryByOrder = await loadOrderItemSummaries(admin, orderIds);
  const now = new Date();
  const todayRange = { dateFrom: toYmd(now), dateTo: toYmd(now) };
  const weekRange = { dateFrom: toYmd(startOfWeek(now)), dateTo: toYmd(now) };
  const monthRange = { dateFrom: todayRange.dateFrom.slice(0, 8) + "01", dateTo: toYmd(now) };
  const activeQuickRange =
    dateFrom === todayRange.dateFrom && dateTo === todayRange.dateTo
      ? "today"
      : dateFrom === weekRange.dateFrom && dateTo === weekRange.dateTo
        ? "week"
        : dateFrom === monthRange.dateFrom && dateTo === monthRange.dateTo
          ? "month"
          : "";
  const exportHref = `/api/orders/export?${new URLSearchParams(
    Object.entries({ status: selected === "all" ? "" : selected, q: q ?? "", dateFrom: dateFrom ?? "", dateTo: dateTo ?? "" }).filter(([, value]) => value),
  ).toString()}`;

  return (
    <section className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-bold text-[#F3F4F6]">{t(lang, "orders.title")}</h1>
          <a href={exportHref} className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-[#163C33] px-4 text-sm font-semibold text-[#F3F4F6] hover:border-[#C9A227]/40">
            {t(lang, "orders.export_csv")}
          </a>
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px] xl:grid-cols-[1fr_180px_180px_auto]">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t(lang, "orders.search_placeholder")}
            className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-white placeholder:text-white/35"
          />
          <input
            type="date"
            name="dateFrom"
            defaultValue={dateFrom ?? ""}
            className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-white"
          />
          <input
            type="date"
            name="dateTo"
            defaultValue={dateTo ?? ""}
            className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-white"
          />
          <button type="submit" className="h-10 rounded-xl bg-[#C9A227] px-4 text-sm font-semibold text-black">
            {t(lang, "common.filter")}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { key: "today", label: t(lang, "orders.today"), ...todayRange },
            { key: "week", label: t(lang, "orders.this_week"), ...weekRange },
            { key: "month", label: t(lang, "orders.this_month"), ...monthRange },
          ].map((range) => (
            <Link
              key={range.key}
              href={buildOrderQuery({ status: selected === "all" ? "" : selected, q: q ?? "", dateFrom: range.dateFrom, dateTo: range.dateTo })}
              className={`rounded-lg px-3 py-1 text-sm ${activeQuickRange === range.key ? "bg-[#163C33] border border-[#C9A227] text-[#F3F4F6]" : "bg-[#163C33] text-[#9CA3AF] border border-white/10"}`}
            >
              {range.label}
            </Link>
          ))}
          <Link
            href={buildOrderQuery({ status: selected === "all" ? "" : selected, q: q ?? "" })}
            className={`rounded-lg px-3 py-1 text-sm ${!dateFrom && !dateTo ? "bg-[#163C33] border border-[#C9A227] text-[#F3F4F6]" : "bg-[#163C33] text-[#9CA3AF] border border-white/10"}`}
          >
            {t(lang, "orders.all_time")}
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <Link
              key={s}
              href={buildOrderQuery({ status: s === "all" ? "" : s, q: q ?? "", dateFrom: dateFrom ?? "", dateTo: dateTo ?? "" })}
              className={`rounded-lg px-3 py-1 text-sm ${selected === s ? "bg-[#163C33] border border-[#C9A227] text-[#F3F4F6]" : "bg-[#163C33] text-[#9CA3AF] border border-white/10"}`}
            >
              {orderPaymentStatusLabel(s, lang)}
            </Link>
          ))}
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#112E27]">
        {loadError ? <p className="px-4 py-3 text-xs text-rose-300">{t(lang, "orders.query_error")} {loadError}</p> : null}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 bg-[#163C33] text-[#9CA3AF]">
            <tr>
              <th className="px-4 py-3">{t(lang, "orders.order_code")}</th>
              <th className="px-4 py-3">{t(lang, "dashboard.buyer")}</th>
              <th className="px-4 py-3">{t(lang, "orders.items")}</th>
              <th className="px-4 py-3">{t(lang, "dashboard.status")}</th>
              <th className="px-4 py-3">{t(lang, "orders.subtotal")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id} className="border-t border-white/5 text-[#F3F4F6] hover:bg-[#163C33]">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/dashboard/orders/${o.id}`} className="text-[#C9A227]">
                    {o.order_code}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.buyer_name ?? t(lang, "common.guest")}</td>
                <td className="px-4 py-3 text-xs text-white/70">{itemSummaryByOrder.get(o.id) ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(o.status)}`}>{orderPaymentStatusLabel(o.status, lang)}</span>
                </td>
                <td className="px-4 py-3">{currencyFromCents(o.subtotal_cents)}</td>
              </tr>
            ))}
            {(filteredOrders.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF]">
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
