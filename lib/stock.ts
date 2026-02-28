import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

export type StockItemRequest = {
  productId: string;
  qty: number;
};

export type StockProductRow = {
  id: string;
  name: string;
  shop_id: string;
  price_cents: number;
  is_available: boolean;
  track_stock: boolean | null;
  stock_qty: number | null;
  sold_out: boolean | null;
};

export async function loadStockProducts(admin: AdminClient, shopId: string, productIds: string[]) {
  const uniqueIds = [...new Set(productIds)];
  const { data, error } = await admin
    .from("products")
    .select("id,name,shop_id,price_cents,is_available,track_stock,stock_qty,sold_out")
    .eq("shop_id", shopId)
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((row) => [row.id, row as StockProductRow]));
}

export function ensureCanPurchase(products: Map<string, StockProductRow>, items: StockItemRequest[]) {
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product || !product.is_available || product.sold_out) {
      throw new Error("Invalid product in cart");
    }
    if (product.track_stock && Number(product.stock_qty ?? 0) < item.qty) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }
}

export async function applyStockDeltas(
  admin: AdminClient,
  products: Map<string, StockProductRow>,
  deltas: Array<{ productId: string; delta: number }>,
) {
  const applied: Array<{ productId: string; delta: number }> = [];

  for (const entry of deltas) {
    if (!entry.delta) continue;
    const product = products.get(entry.productId);
    if (!product) {
      throw new Error("Product not found");
    }
    if (!product.track_stock) continue;

    const currentQty = Number(product.stock_qty ?? 0);
    const nextQty = currentQty + entry.delta;
    if (nextQty < 0) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    const { error } = await admin
      .from("products")
      .update({
        stock_qty: nextQty,
        sold_out: nextQty <= 0,
      })
      .eq("id", product.id)
      .eq("stock_qty", currentQty);

    if (error) {
      throw new Error("Stock update failed, please retry.");
    }

    product.stock_qty = nextQty;
    product.sold_out = nextQty <= 0;
    applied.push(entry);
  }

  return applied;
}

export async function rollbackStockDeltas(
  admin: AdminClient,
  products: Map<string, StockProductRow>,
  deltas: Array<{ productId: string; delta: number }>,
) {
  for (const entry of [...deltas].reverse()) {
    if (!entry.delta) continue;
    const product = products.get(entry.productId);
    if (!product || !product.track_stock) continue;

    const currentQty = Number(product.stock_qty ?? 0);
    const nextQty = currentQty - entry.delta;

    const { error } = await admin
      .from("products")
      .update({
        stock_qty: nextQty,
        sold_out: nextQty <= 0,
      })
      .eq("id", product.id)
      .eq("stock_qty", currentQty);

    if (!error) {
      product.stock_qty = nextQty;
      product.sold_out = nextQty <= 0;
    }
  }
}
