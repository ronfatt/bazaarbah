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
  promoStartAt: z.string().datetime().nullable().optional(),
  promoEndAt: z.string().datetime().nullable().optional(),
});

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

  const admin = createAdminClient();
  const { error } = await admin
    .from("plan_prices")
    .upsert({
      plan_tier: payload.planTier,
      list_price_cents: payload.listPriceCents,
      promo_price_cents: payload.promoPriceCents ?? null,
      promo_active: payload.promoActive,
      promo_start_at: payload.promoStartAt ?? null,
      promo_end_at: payload.promoEndAt ?? null,
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
