import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";

const patchSchema = z.object({
  planTier: z.enum(["pro_88", "pro_128"]),
  listPriceCents: z.number().int().positive(),
  promoPriceCents: z.number().int().positive().nullable().optional(),
  promoActive: z.boolean(),
  promoStartAt: z.string().trim().min(1).nullable().optional(),
  promoEndAt: z.string().trim().min(1).nullable().optional(),
});

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
  const { data, error } = await admin.from("plan_prices").select("*").order("plan_tier", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ prices: data ?? [] });
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

  if (payload.promoPriceCents && payload.promoPriceCents >= payload.listPriceCents) {
    return NextResponse.json({ error: "Promo price must be lower than list price." }, { status: 400 });
  }

  const promoStartAt = parseDateInput(payload.promoStartAt);
  const promoEndAt = parseDateInput(payload.promoEndAt);
  if (payload.promoStartAt && !promoStartAt) {
    return NextResponse.json({ error: "Invalid promo start datetime format." }, { status: 400 });
  }
  if (payload.promoEndAt && !promoEndAt) {
    return NextResponse.json({ error: "Invalid promo end datetime format." }, { status: 400 });
  }
  if (promoStartAt && promoEndAt && new Date(promoEndAt).getTime() <= new Date(promoStartAt).getTime()) {
    return NextResponse.json({ error: "Promo end must be later than promo start." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("plan_prices")
    .upsert({
      plan_tier: payload.planTier,
      list_price_cents: payload.listPriceCents,
      promo_price_cents: payload.promoPriceCents ?? null,
      promo_active: payload.promoActive,
      promo_start_at: promoStartAt,
      promo_end_at: promoEndAt,
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
    },
  });

  return NextResponse.json({ ok: true });
}
