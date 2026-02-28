import type { SupabaseClient } from "@supabase/supabase-js";
import { t, type Lang } from "@/lib/i18n";

export const ORDER_STATUSES = ["all", "pending_payment", "proof_submitted", "paid", "cancelled"] as const;

export type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

export type OrderListRow = {
  id: string;
  order_code: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  status: string;
  subtotal_cents: number;
  created_at: string;
  paid_at: string | null;
  shop_name: string | null;
};

type OrderItemSummaryRow = {
  order_id: string;
  qty: number;
  products: { name: string } | { name: string }[] | null;
};

type OrderFilters = {
  status?: OrderStatusFilter;
  dateFrom?: string;
  dateTo?: string;
};

type AdminClient = SupabaseClient<any, "public", any>;

export async function loadSellerOrders(admin: AdminClient, ownerId: string, filters: OrderFilters = {}) {
  const selected = filters.status && ORDER_STATUSES.includes(filters.status) ? filters.status : "all";

  const primaryQuery = admin
    .from("orders")
    .select("id,order_code,buyer_name,buyer_phone,status,subtotal_cents,created_at,paid_at,shops!inner(owner_id,shop_name)")
    .eq("shops.owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (selected !== "all") {
    primaryQuery.eq("status", selected);
  }
  if (filters.dateFrom) {
    primaryQuery.gte("created_at", `${filters.dateFrom}T00:00:00`);
  }
  if (filters.dateTo) {
    primaryQuery.lte("created_at", `${filters.dateTo}T23:59:59`);
  }

  const primary = await primaryQuery;
  if (!primary.error) {
    const orders = ((primary.data as unknown as Array<OrderListRow & { shops?: { shop_name?: string | null } | { shop_name?: string | null }[] | null }> | null) ?? []).map((row) => {
      const shopRaw = row.shops;
      const shop = Array.isArray(shopRaw) ? shopRaw[0] : shopRaw;
      return { ...row, shop_name: shop?.shop_name ?? null };
    });
    return { orders, loadError: null };
  }

  const shopsRes = await admin.from("shops").select("id").eq("owner_id", ownerId);
  if (shopsRes.error) {
    return { orders: [] as OrderListRow[], loadError: shopsRes.error.message };
  }

  const shopIds = (shopsRes.data ?? []).map((shop) => shop.id);
  if (!shopIds.length) {
    return { orders: [] as OrderListRow[], loadError: null };
  }

  const fallbackQuery = admin
    .from("orders")
    .select("id,order_code,buyer_name,buyer_phone,status,subtotal_cents,created_at,paid_at,shops(shop_name)")
    .in("shop_id", shopIds)
    .order("created_at", { ascending: false });

  if (selected !== "all") {
    fallbackQuery.eq("status", selected);
  }
  if (filters.dateFrom) {
    fallbackQuery.gte("created_at", `${filters.dateFrom}T00:00:00`);
  }
  if (filters.dateTo) {
    fallbackQuery.lte("created_at", `${filters.dateTo}T23:59:59`);
  }

  const fallback = await fallbackQuery;
  if (fallback.error) {
    return { orders: [] as OrderListRow[], loadError: fallback.error.message };
  }

  const orders = ((fallback.data as Array<OrderListRow & { shops?: { shop_name?: string | null } | { shop_name?: string | null }[] | null }> | null) ?? []).map((row) => {
    const shopRaw = row.shops;
    const shop = Array.isArray(shopRaw) ? shopRaw[0] : shopRaw;
    return { ...row, shop_name: shop?.shop_name ?? null };
  });

  return { orders, loadError: null };
}

export function filterOrdersByQuery(orders: OrderListRow[], rawQuery?: string) {
  const query = (rawQuery ?? "").trim().toLowerCase();
  if (!query) return orders;

  return orders.filter((order) => {
    const haystack = `${order.order_code} ${order.buyer_name ?? ""} ${order.buyer_phone ?? ""} ${order.status}`.toLowerCase();
    return haystack.includes(query);
  });
}

export async function loadOrderItemSummaries(admin: AdminClient, orderIds: string[]) {
  if (!orderIds.length) {
    return new Map<string, string>();
  }

  const { data } = await admin.from("order_items").select("order_id,qty,products(name)").in("order_id", orderIds);
  const itemSummaryByOrder = new Map<string, string>();

  for (const row of (data ?? []) as OrderItemSummaryRow[]) {
    const productName = Array.isArray(row.products) ? row.products[0]?.name : row.products?.name;
    if (!productName) continue;

    const label = `${productName} x${row.qty}`;
    const current = itemSummaryByOrder.get(row.order_id);
    itemSummaryByOrder.set(row.order_id, current ? `${current}, ${label}` : label);
  }

  return itemSummaryByOrder;
}

export function orderPaymentStatusLabel(status: string, lang: Lang = "en") {
  if (status === "pending_payment") return t(lang, "orders.status_pending_payment");
  if (status === "proof_submitted") return t(lang, "orders.status_proof_submitted");
  if (status === "paid") return t(lang, "orders.status_paid");
  if (status === "cancelled") return t(lang, "orders.status_cancelled");
  if (status === "all") return t(lang, "orders.status_all");
  return status;
}
