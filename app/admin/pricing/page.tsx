import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { AdminSignoutButton } from "@/components/admin/admin-signout-button";
import { PricingManager } from "@/components/admin/pricing-manager";
import { requireAdminPortalUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_AI_TOTAL_CREDITS, PLAN_PRICE_CENTS, type PlanPriceRow } from "@/lib/plan";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

export default async function AdminPricingPage() {
  const lang = await getLangFromCookie();
  await requireAdminPortalUser();
  const admin = createAdminClient();
  await admin.from("plan_prices").upsert(
    [
      { plan_tier: "pro_88", list_price_cents: PLAN_PRICE_CENTS.pro_88, ai_total_credits: PLAN_AI_TOTAL_CREDITS.pro_88 },
      { plan_tier: "pro_128", list_price_cents: PLAN_PRICE_CENTS.pro_128, ai_total_credits: PLAN_AI_TOTAL_CREDITS.pro_128 },
    ],
    { onConflict: "plan_tier" },
  );

  const { data } = await admin
    .from("plan_prices")
    .select("plan_tier,list_price_cents,promo_price_cents,promo_active,promo_start_at,promo_end_at,ai_total_credits")
    .order("plan_tier", { ascending: true });
  const { data: costs, error: costsErr } = await admin.from("ai_credit_costs").select("ai_type,cost");
  const { data: topup } = await admin
    .from("credit_topup_configs")
    .select("target_plan,label,credits,price_cents,is_active")
    .eq("target_plan", "credit_100")
    .maybeSingle();

  const pricesMap = new Map((data ?? []).map((row) => [row.plan_tier, row]));
  const mergedPrices = (["pro_88", "pro_128"] as const).map((tier) => {
    const row = pricesMap.get(tier);
    return {
      plan_tier: tier,
      list_price_cents: Number(row?.list_price_cents ?? PLAN_PRICE_CENTS[tier]),
      promo_price_cents: row?.promo_price_cents ?? null,
      promo_active: Boolean(row?.promo_active ?? false),
      promo_start_at: row?.promo_start_at ?? null,
      promo_end_at: row?.promo_end_at ?? null,
      ai_total_credits: Number(row?.ai_total_credits ?? PLAN_AI_TOTAL_CREDITS[tier]),
    };
  });

  const costTableMissing = Boolean(costsErr && (costsErr as { code?: string }).code === "42P01");

  return (
    <main className="min-h-screen bg-bb-bg px-6 py-6 text-bb-text">
      <div className="mx-auto w-full max-w-[1180px] space-y-6">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t(lang, "admin.pricing_control")}</h1>
              <p className="mt-2 text-sm text-white/65">{t(lang, "admin.pricing_desc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/plan-requests" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.plan_reviews")}
              </Link>
              <Link href="/admin/members" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.members")}
              </Link>
              <Link href="/admin/announcements" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.announcements")}
              </Link>
              <Link href="/admin/ai-impact" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                AI Impact
              </Link>
              <Badge variant="ai">{t(lang, "admin.pricing")}</Badge>
              <AdminSignoutButton lang={lang} />
            </div>
          </div>
        </AppCard>

        <PricingManager
          initialPrices={mergedPrices as (PlanPriceRow & { ai_total_credits: number })[]}
          initialTopup={{
            label: topup?.label ?? "Credit Top-up",
            credits: Number(topup?.credits ?? 100),
            price_cents: Number(topup?.price_cents ?? 9800),
            is_active: Boolean(topup?.is_active ?? true),
          }}
          initialCosts={{
            copy: Number(costs?.find((c) => c.ai_type === "copy")?.cost ?? 1),
            image: Number(costs?.find((c) => c.ai_type === "product_image")?.cost ?? 1),
            poster: Number(costs?.find((c) => c.ai_type === "poster")?.cost ?? 1),
          }}
          lang={lang}
          hideAiCosts={costTableMissing}
        />
      </div>
    </main>
  );
}
