import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";
import { PLAN_AI_CREDITS } from "@/lib/plan";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_plan"), targetPlan: z.enum(["free", "pro_88", "pro_128"]) }),
  z.object({ action: z.literal("ban"), reason: z.string().max(200).optional() }),
  z.object({ action: z.literal("unban") }),
  z.object({ action: z.literal("warn"), title: z.string().min(2).max(100), body: z.string().min(4).max(500) }),
]);

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
  const { data: member } = await admin.from("profiles").select("id,plan_tier,is_banned").eq("id", id).maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (payload.action === "set_plan") {
    const targetPlan = payload.targetPlan;
    const credits = PLAN_AI_CREDITS[targetPlan];
    const update =
      targetPlan === "free"
        ? { plan: "basic", plan_tier: "free", copy_credits: 0, image_credits: 0, poster_credits: 0 }
        : { plan: "pro", plan_tier: targetPlan, copy_credits: credits.copy, image_credits: credits.image, poster_credits: credits.poster };

    const { error } = await admin.from("profiles").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.from("admin_audit_logs").insert({
      action: "member_plan_changed",
      actor_id: user.id,
      target_user_id: id,
      target_plan: targetPlan === "free" ? null : targetPlan,
      meta: { from_plan: member.plan_tier, to_plan: targetPlan },
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.action === "ban") {
    const { error } = await admin
      .from("profiles")
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: payload.reason?.trim() || null,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.from("admin_audit_logs").insert({
      action: "member_banned",
      actor_id: user.id,
      target_user_id: id,
      target_plan: null,
      note: payload.reason?.trim() || null,
      meta: {},
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.action === "unban") {
    const { error } = await admin
      .from("profiles")
      .update({
        is_banned: false,
        banned_at: null,
        ban_reason: null,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.from("admin_audit_logs").insert({
      action: "member_unbanned",
      actor_id: user.id,
      target_user_id: id,
      target_plan: null,
      meta: {},
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.action === "warn") {
    const { error: noticeErr } = await admin.from("member_notices").insert({
      scope: "user",
      type: "warning",
      user_id: id,
      title: payload.title.trim(),
      body: payload.body.trim(),
      created_by: user.id,
    });
    if (noticeErr) return NextResponse.json({ error: noticeErr.message }, { status: 400 });

    await admin.from("admin_audit_logs").insert({
      action: "member_warned",
      actor_id: user.id,
      target_user_id: id,
      target_plan: null,
      note: payload.title.trim(),
      meta: { body: payload.body.trim() },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

