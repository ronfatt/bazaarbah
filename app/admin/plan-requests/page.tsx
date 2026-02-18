import { AppCard } from "@/components/ui/AppCard";
import { PlanReviewTable } from "@/components/dashboard/plan-review-table";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminPortalUser } from "@/lib/auth";

export default async function AdminPlanRequestsPortalPage() {
  await requireAdminPortalUser();
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("plan_requests")
    .select("id,user_id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at,profiles(display_name)")
    .order("submitted_at", { ascending: false });

  return (
    <main className="min-h-screen bg-bb-bg px-6 py-6 text-bb-text">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <AppCard className="p-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-white/65">Plan upgrade review center.</p>
        </AppCard>

        <PlanReviewTable rows={rows ?? []} />
      </div>
    </main>
  );
}

