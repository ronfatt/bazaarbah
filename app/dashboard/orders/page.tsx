import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

const statuses = ["all", "pending_payment", "proof_submitted", "paid", "cancelled"] as const;

type OrderListRow = {
  id: string;
  order_code: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  status: string;
  subtotal_cents: number;
  created_at: string;
};

type OrderItemSummaryRow = {
  order_id: string;
  qty: number;
  products: { name: string } | { name: string }[] | null;
};

function statusClass(status: string) {
  if (status === "paid") return "bg-green-500/10 text-green-400";
  if (status === "cancelled") return "bg-red-500/10 text-red-400";
  if (status === "pending_payment" || status === "proof_submitted") return "bg-yellow-500/10 text-yellow-400";
  return "bg-white/10 text-[#9CA3AF]";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const lang = await getLangFromCookie();
  const { status, q, dateFrom, dateTo } = (await searchParams) as { status?: string; q?: string; dateFrom?: string; dateTo?: string };
  const selected = statuses.includes((status ?? "all") as (typeof statuses)[number]) ? (status ?? "all") : "all";
  const query = (q ?? "").trim().toLowerCase();

  const { user } = await requireSeller();
  const admin = createAdminClient();

  const primaryQuery = admin
    .from("orders")
    .select("id,order_code,buyer_name,buyer_phone,status,subtotal_cents,created_at,shops!inner(owner_id)")
    .eq("shops.owner_id", user.id)
    .order("created_at", { ascending: false });

  if (selected !== "all") {
    primaryQuery.eq("status", selected);
  }
  if (dateFrom) {
    primaryQuery.gte("created_at", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    primaryQuery.lte("created_at", `${dateTo}T23:59:59`);
  }

  let orders: OrderListRow[] | null = null;
  let loadError: string | null = null;

  const primary = await primaryQuery;
  if (primary.error) {
    const shopsRes = await admin.from("shops").select("id").eq("owner_id", user.id);
    if (shopsRes.error) {
      loadError = shopsRes.error.message;
    } else {
      const shopIds = (shopsRes.data ?? []).map((s) => s.id);
      if (shopIds.length) {
        const fallbackQuery = admin
          .from("orders")
          .select("id,order_code,buyer_name,buyer_phone,status,subtotal_cents,created_at")
          .in("shop_id", shopIds)
          .order("created_at", { ascending: false });
        if (selected !== "all") fallbackQuery.eq("status", selected);
        if (dateFrom) fallbackQuery.gte("created_at", `${dateFrom}T00:00:00`);
        if (dateTo) fallbackQuery.lte("created_at", `${dateTo}T23:59:59`);
        const fallback = await fallbackQuery;
        if (fallback.error) {
          loadError = fallback.error.message;
        } else {
          orders = (fallback.data as OrderListRow[] | null) ?? [];
        }
      } else {
        orders = [];
      }
    }
  } else {
    orders = (primary.data as unknown as OrderListRow[] | null) ?? [];
  }

  const filteredOrders = (orders ?? []).filter((o) => {
    if (!query) return true;
    const haystack = `${o.order_code} ${o.buyer_name ?? ""} ${o.buyer_phone ?? ""} ${o.status}`.toLowerCase();
    return haystack.includes(query);
  });

  const orderIds = filteredOrders.map((o) => o.id);
  const { data: itemRows } = orderIds.length
    ? await admin.from("order_items").select("order_id,qty,products(name)").in("order_id", orderIds)
    : { data: [] };

  const itemSummaryByOrder = new Map<string, string>();
  for (const row of (itemRows ?? []) as OrderItemSummaryRow[]) {
    const productName = Array.isArray(row.products) ? row.products[0]?.name : row.products?.name;
    if (!productName) continue;
    const label = `${productName} x${row.qty}`;
    const current = itemSummaryByOrder.get(row.order_id);
    itemSummaryByOrder.set(row.order_id, current ? `${current}, ${label}` : label);
  }

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold text-[#F3F4F6]">{t(lang, "orders.title")}</h1>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px] xl:grid-cols-[1fr_180px_180px_auto]">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search order code / buyer / phone"
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
            Filter
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <Link
              key={s}
              href={
                s === "all"
                  ? `/dashboard/orders${q || dateFrom || dateTo ? `?${new URLSearchParams(
                      Object.entries({ q: q ?? "", dateFrom: dateFrom ?? "", dateTo: dateTo ?? "" }).filter(([, value]) => value),
                    ).toString()}` : ""}`
                  : `/dashboard/orders?${new URLSearchParams(
                      Object.entries({ status: s, q: q ?? "", dateFrom: dateFrom ?? "", dateTo: dateTo ?? "" }).filter(([, value]) => value),
                    ).toString()}`
              }
              className={`rounded-lg px-3 py-1 text-sm ${selected === s ? "bg-[#163C33] border border-[#C9A227] text-[#F3F4F6]" : "bg-[#163C33] text-[#9CA3AF] border border-white/10"}`}
            >
              {s}
            </Link>
          ))}
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#112E27]">
        {loadError ? <p className="px-4 py-3 text-xs text-rose-300">Orders query error: {loadError}</p> : null}
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 bg-[#163C33] text-[#9CA3AF]">
            <tr>
              <th className="px-4 py-3">{t(lang, "orders.order_code")}</th>
              <th className="px-4 py-3">{t(lang, "dashboard.buyer")}</th>
              <th className="px-4 py-3">Items</th>
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
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(o.status)}`}>{o.status}</span>
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
