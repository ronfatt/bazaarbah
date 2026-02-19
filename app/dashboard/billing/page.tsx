import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlanTier, PLAN_AI_TOTAL_CREDITS, PLAN_LABEL, type PlanPriceRow } from "@/lib/plan";
import { PlanUpgradePanel } from "@/components/dashboard/plan-upgrade-panel";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

export default async function BillingPage() {
  const lang = await getLangFromCookie();
  const { user, profile } = await requireSeller();
  const tier = normalizePlanTier(profile);
  const effectiveAiCredits = tier === "free" ? 0 : Number(profile.ai_credits ?? 0);
  const admin = createAdminClient();

  const [reqRes, priceRes, referralRes, costRes] = await Promise.all([
    admin
      .from("plan_requests")
      .select("id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false }),
    admin
      .from("plan_prices")
      .select("plan_tier,list_price_cents,promo_price_cents,promo_active,promo_start_at,promo_end_at,ai_total_credits")
      .in("plan_tier", ["pro_88", "pro_128"]),
    admin.from("profiles").select("referral_code,referral_bonus_total").eq("id", user.id).maybeSingle(),
    admin.from("ai_credit_costs").select("ai_type,cost"),
  ]);

  const prices = (priceRes.data ?? []).reduce<Partial<Record<"pro_88" | "pro_128", PlanPriceRow>>>((acc, row) => {
    if (row.plan_tier === "pro_88" || row.plan_tier === "pro_128") {
      const key = row.plan_tier as "pro_88" | "pro_128";
      acc[key] = row as PlanPriceRow;
    }
    return acc;
  }, {});
  const aiTotals = {
    free: 0,
    pro_88: Number(prices.pro_88?.ai_total_credits ?? PLAN_AI_TOTAL_CREDITS.pro_88),
    pro_128: Number(prices.pro_128?.ai_total_credits ?? PLAN_AI_TOTAL_CREDITS.pro_128),
  };
  const imageCost = Number(costRes.data?.find((c) => c.ai_type === "product_image")?.cost ?? 1);
  const posterCost = Number(costRes.data?.find((c) => c.ai_type === "poster")?.cost ?? 1);

  const { count: referredCount } = await admin.from("referral_rewards").select("id", { count: "exact", head: true }).eq("referrer_id", user.id);

  return (
    <section className="space-y-5">
      <AppCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t(lang, "billing.title")}</h1>
            <p className="mt-2 text-sm text-white/65">{t(lang, "billing.free_desc")}</p>
          </div>
          <Badge variant={tier === "free" ? "pending" : "paid"}>{PLAN_LABEL[tier]}</Badge>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#163C33] p-4 text-sm text-white/80">
          <p>{t(lang, "billing.plan_credits")}</p>
          <p className="mt-1">AI total {aiTotals[tier]}</p>
          <p className="mt-1">~{Math.floor(aiTotals[tier] / posterCost)} posters or ~{Math.floor(aiTotals[tier] / imageCost)} product photo enhancements</p>
          <p className="mt-1">Current balance: {effectiveAiCredits}</p>
        </div>
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-lg font-semibold">{t(lang, "billing.referral_title")}</h2>
        <p className="mt-2 text-sm text-white/65">{t(lang, "billing.referral_desc")}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm">
            <p className="text-white/65">{t(lang, "billing.your_code")}</p>
            <p className="mt-1 font-mono text-lg text-white">{referralRes.data?.referral_code ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm">
            <p className="text-white/65">{t(lang, "billing.referred_upgrades")}</p>
            <p className="mt-1 text-lg font-semibold text-white">{referredCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm">
            <p className="text-white/65">{t(lang, "billing.total_bonus")}</p>
            <p className="mt-1 text-lg font-semibold text-white">{referralRes.data?.referral_bonus_total ?? 0}</p>
          </div>
        </div>
      </AppCard>

      <PlanUpgradePanel
        currentTier={tier}
        aiCredits={effectiveAiCredits}
        prices={prices}
        planTotals={aiTotals}
        usageGuide={{ imageCost, posterCost }}
        requests={(reqRes.data ?? [])}
        lang={lang}
      />
    </section>
  );
}
