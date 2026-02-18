import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: ownShops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const ownShopIds = ownShops?.map((s) => s.id) ?? [];

  const { data: order } = await admin.from("orders").select("id").eq("id", id).in("shop_id", ownShopIds).maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await admin.from("orders").update({ status: "paid" }).eq("id", order.id);
  await admin.from("payments").update({ confirmed_at: new Date().toISOString(), confirmed_by: user.id }).eq("order_id", order.id).is("confirmed_at", null);

  return NextResponse.json({ ok: true });
}
