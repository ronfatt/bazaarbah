import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/auth";
import type { OrderStatusFilter } from "@/lib/orders";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { filterOrdersByQuery, loadOrderItemSummaries, loadSellerOrders, orderPaymentStatusLabel, ORDER_STATUSES } from "@/lib/orders";
import { currencyFromCents, formatDateTimeMY } from "@/lib/utils";

function csvEscape(value: string | null | undefined) {
  const text = value ?? "";
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const lang = await getLangFromCookie();
  const url = new URL(req.url);
  const rawStatus = url.searchParams.get("status") ?? "all";
  const status: OrderStatusFilter = ORDER_STATUSES.includes(rawStatus as OrderStatusFilter) ? (rawStatus as OrderStatusFilter) : "all";
  const q = url.searchParams.get("q") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";

  const { user } = await requireSeller();
  const admin = createAdminClient();
  const { orders, loadError } = await loadSellerOrders(admin, user.id, { status, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });

  if (loadError) {
    return NextResponse.json({ error: loadError }, { status: 500 });
  }

  const filteredOrders = filterOrdersByQuery(orders, q);
  const itemSummaryByOrder = await loadOrderItemSummaries(
    admin,
    filteredOrders.map((order) => order.id),
  );

  const header = [
    t(lang, "orders.csv_order_code"),
    t(lang, "orders.csv_shop_name"),
    t(lang, "orders.csv_buyer"),
    t(lang, "orders.csv_phone"),
    t(lang, "orders.csv_items"),
    t(lang, "orders.csv_payment_status"),
    t(lang, "orders.csv_status_code"),
    t(lang, "orders.subtotal"),
    t(lang, "orders.csv_created_at"),
    t(lang, "orders.csv_paid_at"),
  ];
  const rows = filteredOrders.map((order) =>
    [
      order.order_code,
      order.shop_name ?? "",
      order.buyer_name ?? t(lang, "common.guest"),
      order.buyer_phone ?? "",
      itemSummaryByOrder.get(order.id) ?? "",
      orderPaymentStatusLabel(order.status, lang),
      order.status,
      currencyFromCents(order.subtotal_cents),
      formatDateTimeMY(order.created_at),
      order.paid_at ? formatDateTimeMY(order.paid_at) : "",
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [header.map(csvEscape).join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
    },
  });
}
