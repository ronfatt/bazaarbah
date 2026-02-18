import { CheckCircle2, Clock3, Search, ShieldAlert, Users } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { PlanReviewTable } from "@/components/dashboard/plan-review-table";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminPortalUser } from "@/lib/auth";
import { currencyFromCents } from "@/lib/utils";
import { PLAN_LABEL } from "@/lib/plan";
import { AdminSignoutButton } from "@/components/admin/admin-signout-button";
import Link from "next/link";

type RequestRow = {
  id: string;
  user_id: string;
  target_plan: "pro_88" | "pro_128";
  amount_cents: number;
  status: "pending_review" | "approved" | "rejected";
  proof_image_url: string | null;
  reference_text: string | null;
  note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

type AuditLog = {
  id: string;
  action: "plan_request_approved" | "plan_request_rejected";
  target_user_id: string;
  target_plan: "pro_88" | "pro_128" | null;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
};

function averageReviewMinutes(rows: RequestRow[]) {
  const reviewed = rows.filter((r) => r.reviewed_at);
  if (!reviewed.length) return 0;
  const minutes =
    reviewed.reduce((sum, r) => {
      const start = new Date(r.submitted_at).getTime();
      const end = new Date(r.reviewed_at ?? r.submitted_at).getTime();
      return sum + Math.max(0, end - start) / 60000;
    }, 0) / reviewed.length;
  return Math.round(minutes);
}

export default async function AdminPlanRequestsPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminPortalUser();
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const query = (params.q ?? "").trim().toLowerCase();

  const admin = createAdminClient();
  const [requestRes, profileRes, auditRes] = await Promise.all([
    admin
      .from("plan_requests")
      .select("id,user_id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at,profiles(display_name)")
      .order("submitted_at", { ascending: false }),
    admin.from("profiles").select("plan_tier"),
    admin
      .from("admin_audit_logs")
      .select("id,action,target_user_id,target_plan,from_status,to_status,note,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const allRows = (requestRes.data ?? []) as RequestRow[];
  const rows = allRows.filter((row) => {
    const statusPass = statusFilter === "all" ? true : row.status === statusFilter;
    if (!statusPass) return false;
    if (!query) return true;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const haystack = `${profile?.display_name ?? ""} ${row.user_id} ${row.reference_text ?? ""} ${row.target_plan}`.toLowerCase();
    return haystack.includes(query);
  });

  const todayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const pendingCount = allRows.filter((r) => r.status === "pending_review").length;
  const approvedToday = allRows.filter((r) => r.status === "approved" && (r.reviewed_at ?? "") >= todayIso).length;
  const avgMins = averageReviewMinutes(allRows);
  const totalApprovedAmount = allRows.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.amount_cents, 0);
  const tierRows = profileRes.data ?? [];
  const freeCount = tierRows.filter((p) => p.plan_tier === "free").length;
  const rm88Count = tierRows.filter((p) => p.plan_tier === "pro_88").length;
  const rm128Count = tierRows.filter((p) => p.plan_tier === "pro_128").length;
  const logs = (auditRes.data ?? []) as AuditLog[];

  return (
    <main className="min-h-screen bg-bb-bg px-6 py-6 text-bb-text">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="mt-2 text-sm text-white/65">Upgrade review, approval SLA, and audit visibility in one panel.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/members" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Members
              </Link>
              <Link href="/admin/announcements" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Announcements
              </Link>
              <Link href="/admin/pricing" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Pricing
              </Link>
              <Badge variant="ai">Live Ops</Badge>
              <AdminSignoutButton />
            </div>
          </div>
        </AppCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Pending Reviews" value={String(pendingCount)} trend={pendingCount > 0 ? 8 : 0} icon={Clock3} accent="yellow" />
          <KpiCard title="Approved Today" value={String(approvedToday)} trend={6} icon={CheckCircle2} accent="green" />
          <KpiCard title="Avg Review Time" value={`${avgMins} min`} trend={-3} icon={ShieldAlert} accent="teal" />
          <KpiCard title="Approved Revenue" value={currencyFromCents(totalApprovedAmount)} trend={12} icon={Users} accent="gold" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-9">
            <AppCard className="p-5">
              <form className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" />
                  <input
                    name="q"
                    defaultValue={params.q ?? ""}
                    placeholder="Search by display name, user id, or reference"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                  />
                </label>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                >
                  <option value="all">All statuses</option>
                  <option value="pending_review">Pending only</option>
                  <option value="approved">Approved only</option>
                  <option value="rejected">Rejected only</option>
                </select>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-gradient-to-r from-[#C9A227] to-[#E2C044] px-4 text-sm font-semibold text-black hover:brightness-110"
                >
                  Apply
                </button>
              </form>
            </AppCard>

            <PlanReviewTable rows={rows} />
          </div>

          <div className="space-y-6 xl:col-span-3">
            <AppCard className="p-5">
              <h3 className="text-lg font-semibold">Plan Distribution</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-[#163C33] p-3">
                  <span className="text-white/65">Free</span>
                  <span className="font-semibold">{freeCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#163C33] p-3">
                  <span className="text-white/65">{PLAN_LABEL.pro_88}</span>
                  <span className="font-semibold">{rm88Count}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#163C33] p-3">
                  <span className="text-white/65">{PLAN_LABEL.pro_128}</span>
                  <span className="font-semibold">{rm128Count}</span>
                </div>
              </div>
            </AppCard>

            <AppCard className="p-5">
              <h3 className="text-lg font-semibold">Audit Trail</h3>
              <div className="mt-3 space-y-2 text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-white/75">
                    <p className="font-semibold text-white">{log.action === "plan_request_approved" ? "Approved" : "Rejected"}</p>
                    <p className="mt-1">User: {log.target_user_id.slice(0, 8)}...</p>
                    <p>Plan: {log.target_plan ? PLAN_LABEL[log.target_plan] : "-"}</p>
                    <p>At: {new Date(log.created_at).toLocaleString("en-MY")}</p>
                    {log.note ? <p className="mt-1 text-rose-300">Note: {log.note}</p> : null}
                  </div>
                ))}
                {logs.length === 0 ? <p className="text-white/45">No audit logs yet.</p> : null}
              </div>
            </AppCard>
          </div>
        </div>
      </div>
    </main>
  );
}
