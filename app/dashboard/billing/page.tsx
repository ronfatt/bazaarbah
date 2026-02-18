import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlanTier, PLAN_AI_CREDITS, PLAN_LABEL, type PlanPriceRow } from "@/lib/plan";
import { PlanUpgradePanel } from "@/components/dashboard/plan-upgrade-panel";

export default async function BillingPage() {
  const { user, profile } = await requireSeller();
  const tier = normalizePlanTier(profile);
  const included = PLAN_AI_CREDITS[tier];
  const effectiveCopy = tier === "free" ? 0 : profile.copy_credits;
  const effectiveImage = tier === "free" ? 0 : profile.image_credits;
  const effectivePoster = tier === "free" ? 0 : profile.poster_credits;
  const admin = createAdminClient();

  const [reqRes, priceRes, referralRes] = await Promise.all([
    admin
      .from("plan_requests")
      .select("id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false }),
    admin
      .from("plan_prices")
      .select("plan_tier,list_price_cents,promo_price_cents,promo_active,promo_start_at,promo_end_at")
      .in("plan_tier", ["pro_88", "pro_128"]),
    admin.from("profiles").select("referral_code,referral_bonus_total").eq("id", user.id).maybeSingle(),
  ]);

  const prices = (priceRes.data ?? []).reduce<Partial<Record<"pro_88" | "pro_128", PlanPriceRow>>>((acc, row) => {
    if (row.plan_tier === "pro_88" || row.plan_tier === "pro_128") {
      const key = row.plan_tier as "pro_88" | "pro_128";
      acc[key] = row as PlanPriceRow;
    }
    return acc;
  }, {});

  const { count: referredCount } = await admin.from("referral_rewards").select("id", { count: "exact", head: true }).eq("referrer_id", user.id);

  return (
    <section className="space-y-5">
      <AppCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Billing & Access</h1>
            <p className="mt-2 text-sm text-white/65">Free users can view dashboard only. Submit upgrade request to unlock all modules.</p>
          </div>
          <Badge variant={tier === "free" ? "pending" : "paid"}>{PLAN_LABEL[tier]}</Badge>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#163C33] p-4 text-sm text-white/80">
          <p>Plan credits included:</p>
          <p className="mt-1">
            Copy {included.copy} • Image {included.image} • Poster {included.poster}
          </p>
        </div>
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-lg font-semibold">Referral Program</h2>
        <p className="mt-2 text-sm text-white/65">Share your code. When referred member upgrades, you get bonus AI credits.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm">
            <p className="text-white/65">Your code</p>
            <p className="mt-1 font-mono text-lg text-white">{referralRes.data?.referral_code ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm">
            <p className="text-white/65">Referred upgrades</p>
            <p className="mt-1 text-lg font-semibold text-white">{referredCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm">
            <p className="text-white/65">Total bonus credits</p>
            <p className="mt-1 text-lg font-semibold text-white">{referralRes.data?.referral_bonus_total ?? 0}</p>
          </div>
        </div>
      </AppCard>

      <PlanUpgradePanel
        currentTier={tier}
        copyCredits={effectiveCopy}
        imageCredits={effectiveImage}
        posterCredits={effectivePoster}
        prices={prices}
        requests={(reqRes.data ?? [])}
      />
    </section>
  );
}
