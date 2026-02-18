import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReceiptNo } from "@/lib/utils";
import { assertUnlockedByUserId } from "@/lib/auth";

async function createReceiptIfMissing(admin: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data: exists } = await admin.from("receipts").select("id").eq("order_id", orderId).maybeSingle();
  if (exists) return;

  for (let i = 0; i < 5; i++) {
    const receiptNo = generateReceiptNo();
    const { error } = await admin
      .from("receipts")
      .insert({ order_id: orderId, receipt_no: receiptNo, pdf_url: `inline:/api/orders/${orderId}/receipt` });

    if (!error) return;
    if (!error.message.toLowerCase().includes("duplicate") && !error.message.toLowerCase().includes("unique")) {
      throw new Error(error.message);
    }
  }

  throw new Error("Could not generate unique receipt number");
}

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
  try {
    await assertUnlockedByUserId(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan upgrade required";
    return NextResponse.json({ error: message }, { status: 403 });
  }
  const { data: ownShops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const ownShopIds = ownShops?.map((s) => s.id) ?? [];

  const { data: order } = await admin.from("orders").select("id").eq("id", id).in("shop_id", ownShopIds).maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await admin.from("orders").update({ status: "paid" }).eq("id", order.id);
  await admin.from("payments").update({ confirmed_at: new Date().toISOString(), confirmed_by: user.id }).eq("order_id", order.id).is("confirmed_at", null);

  await createReceiptIfMissing(admin, order.id);

  return NextResponse.json({ ok: true });
}
