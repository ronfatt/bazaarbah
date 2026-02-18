import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlanTier, PLAN_AI_CREDITS, PLAN_LABEL } from "@/lib/plan";
import { PlanUpgradePanel } from "@/components/dashboard/plan-upgrade-panel";

export default async function BillingPage() {
  const { user, profile } = await requireSeller();
  const tier = normalizePlanTier(profile);
  const included = PLAN_AI_CREDITS[tier];
  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("plan_requests")
    .select("id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

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

      <PlanUpgradePanel
        currentTier={tier}
        copyCredits={profile.copy_credits}
        imageCredits={profile.image_credits}
        posterCredits={profile.poster_credits}
        requests={(requests ?? [])}
      />
    </section>
  );
}

