import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlanTier, PLAN_PRICE_CENTS, resolveEffectivePrice, type PlanPriceRow } from "@/lib/plan";
import { ensurePublicBucket } from "@/lib/storage";

const allowedPlans = new Set(["pro_88", "pro_128", "credit_100"]);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plan_requests")
    .select("id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,plan,plan_tier").eq("id", user.id).maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const currentTier = normalizePlanTier(profile);

  const form = await req.formData();
  const targetPlan = String(form.get("targetPlan") ?? "");
  const referenceText = String(form.get("referenceText") ?? "").trim();
  const slipUrl = String(form.get("slipUrl") ?? "").trim();
  const file = form.get("slipFile");

  if (!allowedPlans.has(targetPlan)) {
    return NextResponse.json({ error: "Invalid target plan." }, { status: 400 });
  }

  if (currentTier === "pro_128" && targetPlan === "pro_128") {
    return NextResponse.json({ error: "You are already on RM168 plan." }, { status: 400 });
  }

  let amountCents = 9800;
  if (targetPlan === "pro_88" || targetPlan === "pro_128") {
    const { data: planPrice } = await admin
      .from("plan_prices")
      .select("plan_tier,list_price_cents,promo_price_cents,promo_active,promo_start_at,promo_end_at")
      .eq("plan_tier", targetPlan)
      .maybeSingle();
    amountCents = resolveEffectivePrice((planPrice as PlanPriceRow | null) ?? null) ?? PLAN_PRICE_CENTS[targetPlan as "pro_88" | "pro_128"];
  } else {
    const { data: topup } = await admin
      .from("credit_topup_configs")
      .select("price_cents,is_active")
      .eq("target_plan", "credit_100")
      .maybeSingle();
    if (topup && topup.is_active === false) {
      return NextResponse.json({ error: "Credit top-up is currently unavailable." }, { status: 400 });
    }
    amountCents = Number(topup?.price_cents ?? 9800);
  }
  const { data: pending } = await admin.from("plan_requests").select("id").eq("user_id", user.id).eq("status", "pending_review").limit(1);
  if ((pending?.length ?? 0) > 0) {
    return NextResponse.json({ error: "You already have a pending request." }, { status: 400 });
  }

  let proofImageUrl: string | null = slipUrl || null;
  if (file instanceof File && file.size > 0) {
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "Slip file too large. Max 5MB." }, { status: 400 });
    }

    await ensurePublicBucket(admin, "plan-proofs", maxBytes);

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadErr } = await admin.storage.from("plan-proofs").upload(path, bytes, {
      contentType: file.type || "image/png",
      upsert: false,
    });
    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    }
    const { data: urlData } = admin.storage.from("plan-proofs").getPublicUrl(path);
    proofImageUrl = urlData.publicUrl;
  }

  if (!proofImageUrl) {
    return NextResponse.json({ error: "Please upload bank slip or provide slip URL." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("plan_requests")
    .insert({
      user_id: user.id,
      target_plan: targetPlan,
      amount_cents: amountCents,
      proof_image_url: proofImageUrl,
      reference_text: referenceText || null,
    })
    .select("id,target_plan,amount_cents,status,proof_image_url,reference_text,submitted_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}
