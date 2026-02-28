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
  const effectiveAiCredits = Number(profile.ai_credits ?? 0);
  const admin = createAdminClient();

  const [reqRes, priceRes, costRes] = await Promise.all([
    admin
      .from("plan_requests")
      .select("id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false }),
    admin.from("plan_prices").select("plan_tier,list_price_cents,promo_price_cents,promo_active,promo_start_at,promo_end_at,ai_total_credits").in("plan_tier", ["pro_88", "pro_128"]),
    admin.from("ai_credit_costs").select("ai_type,cost"),
  ]);
  const { data: topup } = await admin
    .from("credit_topup_configs")
    .select("target_plan,label,credits,price_cents,is_active")
    .eq("target_plan", "credit_50")
    .maybeSingle();

  const prices = (priceRes.data ?? []).reduce<Partial<Record<"pro_88" | "pro_128", PlanPriceRow>>>((acc, row) => {
    if (row.plan_tier === "pro_88" || row.plan_tier === "pro_128") {
      const key = row.plan_tier as "pro_88" | "pro_128";
      acc[key] = row as PlanPriceRow;
    }
    return acc;
  }, {});
  const aiTotals = {
    free: PLAN_AI_TOTAL_CREDITS.free,
    pro_88: Number(prices.pro_88?.ai_total_credits ?? PLAN_AI_TOTAL_CREDITS.pro_88),
    pro_128: Number(prices.pro_128?.ai_total_credits ?? PLAN_AI_TOTAL_CREDITS.pro_128),
  };
  const imageCost = Number(costRes.data?.find((c) => c.ai_type === "product_image")?.cost ?? 1);
  const posterCost = Number(costRes.data?.find((c) => c.ai_type === "poster")?.cost ?? 1);

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

      <PlanUpgradePanel
        currentTier={tier}
        aiCredits={effectiveAiCredits}
        prices={prices}
        planTotals={aiTotals}
        topupConfig={{
          label: topup?.label ?? "Credit Top-up",
          credits: Number(topup?.credits ?? 50),
          priceCents: Number(topup?.price_cents ?? 5000),
          isActive: Boolean(topup?.is_active ?? true),
        }}
        usageGuide={{ imageCost, posterCost }}
        requests={(reqRes.data ?? [])}
        lang={lang}
      />
    </section>
  );
}
