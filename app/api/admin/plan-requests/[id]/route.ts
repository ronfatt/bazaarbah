import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";
import { PLAN_AI_CREDITS } from "@/lib/plan";

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
    .select("id,user_id,target_plan,status")
    .eq("id", id)
    .maybeSingle();

  if (requestError || !request) {
    return NextResponse.json({ error: requestError?.message ?? "Request not found" }, { status: 404 });
  }

  if (request.status !== "pending_review") {
    return NextResponse.json({ error: "Request already reviewed." }, { status: 400 });
  }

  if (payload.action === "approve") {
    const target = request.target_plan as "pro_88" | "pro_128";
    const credits = PLAN_AI_CREDITS[target];

    const { error: profileErr } = await admin
      .from("profiles")
      .update({
        plan: "pro",
        plan_tier: target,
        copy_credits: credits.copy,
        image_credits: credits.image,
        poster_credits: credits.poster,
      })
      .eq("id", request.user_id);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
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

  return NextResponse.json({ ok: true });
}
