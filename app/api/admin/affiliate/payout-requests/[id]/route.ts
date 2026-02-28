import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";

const schema = z.object({
  action: z.enum(["approve", "mark_paid", "reject"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertAdminByUserId(user.id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 });
  }

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: payout } = await admin.from("payout_requests").select("id,status,user_id,amount_cents").eq("id", id).maybeSingle();
  if (!payout) {
    return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  if (payload.action === "approve") {
    if (payout.status !== "REQUESTED") {
      return NextResponse.json({ error: "Only requested payouts can be approved" }, { status: 400 });
    }
    const { error } = await admin.from("payout_requests").update({ status: "APPROVED", approved_at: now }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("admin_audit_logs").insert({
      action: "payout_request_approved",
      actor_id: user.id,
      target_user_id: payout.user_id,
      target_plan: null,
      note: String(payout.amount_cents),
      meta: { payout_request_id: id },
    });
    return NextResponse.json({ ok: true });
  }

  if (payload.action === "mark_paid") {
    if (payout.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved payouts can be marked paid" }, { status: 400 });
    }
    const { error } = await admin.from("payout_requests").update({ status: "PAID", paid_at: now }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("admin_audit_logs").insert({
      action: "payout_request_paid",
      actor_id: user.id,
      target_user_id: payout.user_id,
      target_plan: null,
      note: String(payout.amount_cents),
      meta: { payout_request_id: id },
    });
    return NextResponse.json({ ok: true });
  }

  if (payout.status !== "REQUESTED" && payout.status !== "APPROVED") {
    return NextResponse.json({ error: "Only requested or approved payouts can be rejected" }, { status: 400 });
  }
  const { error } = await admin.from("payout_requests").update({ status: "REJECTED" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("admin_audit_logs").insert({
    action: "payout_request_rejected",
    actor_id: user.id,
    target_user_id: payout.user_id,
    target_plan: null,
    note: String(payout.amount_cents),
    meta: { payout_request_id: id },
  });

  return NextResponse.json({ ok: true });
}
