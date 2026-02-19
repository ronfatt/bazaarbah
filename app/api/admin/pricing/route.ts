import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_plan"),
    planTier: z.enum(["pro_88", "pro_128"]),
    listPriceCents: z.number().int().positive(),
    promoPriceCents: z.number().int().positive().nullable().optional(),
    promoActive: z.boolean(),
    promoStartAt: z.string().trim().min(1).nullable().optional(),
    promoEndAt: z.string().trim().min(1).nullable().optional(),
    aiTotalCredits: z.number().int().min(0).max(100000),
  }),
  z.object({
    action: z.literal("update_costs"),
    copyCost: z.number().int().min(1).max(1000),
    imageCost: z.number().int().min(1).max(1000),
    posterCost: z.number().int().min(1).max(1000),
  }),
]);

function parseDateInput(value: string | null | undefined) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;

  const [, ddRaw, mmRaw, yyyyRaw, hhRaw, minRaw, apRaw] = m;
  const dd = Number(ddRaw);
  const mm = Number(mmRaw);
  const yyyy = Number(yyyyRaw);
  let hh = Number(hhRaw) % 12;
  const min = Number(minRaw);
  if (apRaw.toUpperCase() === "PM") hh += 12;

  const parsed = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min, 0));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertAdminByUserId(user.id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ data: prices, error: priceErr }, { data: costs, error: costErr }] = await Promise.all([
    admin.from("plan_prices").select("*").order("plan_tier", { ascending: true }),
    admin.from("ai_credit_costs").select("ai_type,cost"),
  ]);
  if (priceErr) return NextResponse.json({ error: priceErr.message }, { status: 400 });
  const isCostTableMissing = Boolean(costErr && (costErr as { code?: string }).code === "42P01");
  if (costErr && !isCostTableMissing) {
    return NextResponse.json({ error: costErr.message }, { status: 400 });
  }
  return NextResponse.json({ prices: prices ?? [], creditCosts: costs ?? [], costsEnabled: !isCostTableMissing });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertAdminByUserId(user.id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 });
  }

  let payload: z.infer<typeof patchSchema>;
  try {
    payload = patchSchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }

  if (payload.action === "update_plan" && payload.promoPriceCents && payload.promoPriceCents >= payload.listPriceCents) {
    return NextResponse.json({ error: "Promo price must be lower than list price." }, { status: 400 });
  }

  const promoStartAt = payload.action === "update_plan" ? parseDateInput(payload.promoStartAt) : null;
  const promoEndAt = payload.action === "update_plan" ? parseDateInput(payload.promoEndAt) : null;
  if (payload.action === "update_plan") {
    if (payload.promoStartAt && !promoStartAt) {
      return NextResponse.json({ error: "Invalid promo start datetime format." }, { status: 400 });
    }
    if (payload.promoEndAt && !promoEndAt) {
      return NextResponse.json({ error: "Invalid promo end datetime format." }, { status: 400 });
    }
    if (promoStartAt && promoEndAt && new Date(promoEndAt).getTime() <= new Date(promoStartAt).getTime()) {
      return NextResponse.json({ error: "Promo end must be later than promo start." }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  if (payload.action === "update_plan") {
    const { error } = await admin
      .from("plan_prices")
      .upsert({
        plan_tier: payload.planTier,
        list_price_cents: payload.listPriceCents,
        promo_price_cents: payload.promoPriceCents ?? null,
        promo_active: payload.promoActive,
        promo_start_at: promoStartAt,
        promo_end_at: promoEndAt,
        ai_total_credits: payload.aiTotalCredits,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.from("admin_audit_logs").insert({
      action: "plan_price_updated",
      actor_id: user.id,
      target_user_id: user.id,
      note: payload.planTier,
      meta: {
        list_price_cents: payload.listPriceCents,
        promo_price_cents: payload.promoPriceCents ?? null,
        promo_active: payload.promoActive,
        ai_total_credits: payload.aiTotalCredits,
      },
    });
  } else {
    const now = new Date().toISOString();
    const upserts = [
      { ai_type: "copy", cost: payload.copyCost, updated_at: now, updated_by: user.id },
      { ai_type: "product_image", cost: payload.imageCost, updated_at: now, updated_by: user.id },
      { ai_type: "poster", cost: payload.posterCost, updated_at: now, updated_by: user.id },
    ];
    const { error } = await admin.from("ai_credit_costs").upsert(upserts);
    if (error) {
      const missingTable = (error as { code?: string }).code === "42P01";
      return NextResponse.json(
        { error: missingTable ? "ai_credit_costs table is missing. Run migration 011_unified_ai_credits.sql first." : error.message },
        { status: 400 },
      );
    }

    await admin.from("admin_audit_logs").insert({
      action: "ai_credit_cost_updated",
      actor_id: user.id,
      target_user_id: user.id,
      meta: {
        copy_cost: payload.copyCost,
        image_cost: payload.imageCost,
        poster_cost: payload.posterCost,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
