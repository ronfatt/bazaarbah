import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ orderCode: string }> }) {
  const { orderCode } = await params;
  const supabase = await createClient();

  const [orderRes, itemsRes] = await Promise.all([
    supabase.rpc("get_order_public", { p_order_code: orderCode }),
    supabase.rpc("get_order_items_public", { p_order_code: orderCode }),
  ]);

  if (orderRes.error) {
    return NextResponse.json({ error: orderRes.error.message }, { status: 400 });
  }

  const order = orderRes.data?.[0] ?? null;
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (itemsRes.error) {
    return NextResponse.json({ error: itemsRes.error.message }, { status: 400 });
  }

  return NextResponse.json({ order, items: itemsRes.data ?? [] });
}
