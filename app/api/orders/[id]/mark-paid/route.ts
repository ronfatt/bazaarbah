import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReceiptNo } from "@/lib/utils";
import { assertUnlockedByUserId } from "@/lib/auth";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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
  return PATCH(_, { params });
}

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  if (isUuidLike(id)) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await assertUnlockedByUserId(user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Plan upgrade required";
      return NextResponse.json({ error: message }, { status: 403 });
    }
    const { data: ownShops } = await admin.from("shops").select("id").eq("owner_id", user.id);
    const ownShopIds = ownShops?.map((s) => s.id) ?? [];

    const { data: order } = await admin.from("orders").select("id,status").eq("id", id).in("shop_id", ownShopIds).maybeSingle();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status === "paid") {
      return NextResponse.json({ ok: true });
    }
    if (!["pending_payment", "proof_submitted"].includes(order.status)) {
      return NextResponse.json({ error: "Order cannot be marked paid from current status" }, { status: 400 });
    }

    const paidAt = new Date().toISOString();
    await admin.from("orders").update({ status: "paid", paid_at: paidAt }).eq("id", id).in("status", ["pending_payment", "proof_submitted"]);
    await admin.from("payments").update({ confirmed_at: new Date().toISOString(), confirmed_by: user.id }).eq("order_id", id).is("confirmed_at", null);
    await createReceiptIfMissing(admin, id);
    return NextResponse.json({ ok: true, paidAt });
  }

  // Stall-mode public quick pay by order_code.
  const { data: orderByCode } = await admin.from("orders").select("id,status").eq("order_code", id).maybeSingle();
  if (!orderByCode) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (orderByCode.status === "paid") {
    return NextResponse.json({ ok: true });
  }
  if (!["pending_payment", "proof_submitted"].includes(orderByCode.status)) {
    return NextResponse.json({ error: "Order cannot be marked paid from current status" }, { status: 400 });
  }

  const paidAt = new Date().toISOString();
  await admin
    .from("orders")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", orderByCode.id)
    .in("status", ["pending_payment", "proof_submitted"]);

  await admin
    .from("payments")
    .insert({ order_id: orderByCode.id, method: "qr_manual", reference_text: "Stall mode quick pay", confirmed_at: paidAt });

  await createReceiptIfMissing(admin, orderByCode.id);
  return NextResponse.json({ ok: true, paidAt });
}
