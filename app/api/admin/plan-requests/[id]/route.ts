import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";
import { createAffiliateEventAndLedger, ensureAffiliateEnabled } from "@/lib/affiliate";
import { PLAN_AI_CREDITS, PLAN_AI_TOTAL_CREDITS } from "@/lib/plan";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(300).optional(),
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

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }
  const admin = createAdminClient();

  const { data: request, error: requestError } = await admin
    .from("plan_requests")
    .select("id,user_id,target_plan,amount_cents,status")
    .eq("id", id)
    .maybeSingle();

  if (requestError || !request) {
    return NextResponse.json({ error: requestError?.message ?? "Request not found" }, { status: 404 });
  }

  if (request.status !== "pending_review") {
    return NextResponse.json({ error: "Request already reviewed." }, { status: 400 });
  }

  if (payload.action === "approve") {
    if (request.target_plan === "credit_50") {
      const { data: topup } = await admin
        .from("credit_topup_configs")
        .select("credits")
        .eq("target_plan", "credit_50")
        .maybeSingle();
      const topupCredits = Math.max(1, Number(topup?.credits ?? 50));
      const { data: owner } = await admin.from("profiles").select("id,ai_credits").eq("id", request.user_id).maybeSingle();
      if (!owner) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
      const { error: topupErr } = await admin
        .from("profiles")
        .update({ ai_credits: Number(owner.ai_credits ?? 0) + topupCredits })
        .eq("id", request.user_id);
      if (topupErr) {
        return NextResponse.json({ error: topupErr.message }, { status: 400 });
      }
      await createAffiliateEventAndLedger(admin, {
        buyerId: request.user_id,
        eventType: "CREDIT_TOPUP",
        amountCents: Number(request.amount_cents ?? 5000),
        topupCode: "T50",
        externalRef: `plan_request:${request.id}:credit_50`,
      });
    } else {
      const target = request.target_plan as "pro_88" | "pro_128";
      const credits = PLAN_AI_CREDITS[target];
      const { data: planPrice } = await admin.from("plan_prices").select("ai_total_credits").eq("plan_tier", target).maybeSingle();
      const totalCredits = Number(planPrice?.ai_total_credits ?? PLAN_AI_TOTAL_CREDITS[target]);

      const { error: profileErr } = await admin
        .from("profiles")
        .update({
          plan: "pro",
          plan_tier: target,
          ai_credits: totalCredits,
          copy_credits: credits.copy,
          image_credits: credits.image,
          poster_credits: credits.poster,
        })
        .eq("id", request.user_id);
      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }
      const affiliateProfile = await ensureAffiliateEnabled(admin, request.user_id);
      await admin.from("admin_audit_logs").insert({
        action: "affiliate_enabled",
        actor_id: user.id,
        target_user_id: request.user_id,
        plan_request_id: request.id,
        target_plan: target,
        note: affiliateProfile.referral_code,
        meta: { referral_code: affiliateProfile.referral_code },
      });
      await createAffiliateEventAndLedger(admin, {
        buyerId: request.user_id,
        eventType: "PACKAGE_PURCHASE",
        amountCents: Number(request.target_plan === "pro_88" ? 8800 : 16800),
        packageCode: request.target_plan === "pro_88" ? "P88" : "P168",
        externalRef: `plan_request:${request.id}:${request.target_plan}`,
      });
    }
  }

  const { error: updateErr } = await admin
    .from("plan_requests")
    .update({
      status: payload.action === "approve" ? "approved" : "rejected",
      note: payload.note ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", request.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  const toStatus = payload.action === "approve" ? "approved" : "rejected";
  await admin.from("admin_audit_logs").insert({
    action: payload.action === "approve" ? "plan_request_approved" : "plan_request_rejected",
    actor_id: user.id,
    target_user_id: request.user_id,
    plan_request_id: request.id,
    target_plan: request.target_plan === "credit_50" ? null : request.target_plan,
    from_status: request.status,
    to_status: toStatus,
    note: payload.note ?? null,
    meta: {},
  });

  return NextResponse.json({ ok: true });
}
