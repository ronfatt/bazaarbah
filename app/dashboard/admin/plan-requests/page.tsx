import { notFound } from "next/navigation";
import { AppCard } from "@/components/ui/AppCard";
import { requireAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanReviewTable } from "@/components/dashboard/plan-review-table";

export default async function AdminPlanRequestsPage() {
  const { profile } = await requireAdminUser();
  if (profile.role !== "admin") {
    notFound();
  }

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("plan_requests")
    .select("id,user_id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at,profiles(display_name)")
    .order("submitted_at", { ascending: false });

  return (
    <section className="space-y-5">
      <AppCard className="p-6">
        <h1 className="text-2xl font-bold">Plan Upgrade Reviews</h1>
        <p className="mt-2 text-sm text-white/65">Review manual transfer slips and approve account upgrades.</p>
      </AppCard>

      <PlanReviewTable rows={(rows ?? [])} />
    </section>
  );
}

