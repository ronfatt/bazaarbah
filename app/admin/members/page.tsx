import Link from "next/link";
import { Search } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { AdminSignoutButton } from "@/components/admin/admin-signout-button";
import { requireAdminPortalUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProfilesFromAuthUsers } from "@/lib/supabase/sync-auth-profiles";
import { MemberManagementTable } from "@/components/admin/member-management-table";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

type MemberRow = {
  id: string;
  display_name: string | null;
  role: "seller" | "admin";
  plan_tier: "free" | "pro_88" | "pro_128";
  ai_credits: number;
  copy_credits: number;
  image_credits: number;
  poster_credits: number;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const lang = await getLangFromCookie();
  await requireAdminPortalUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const status = params.status ?? "all";

  const admin = createAdminClient();
  await syncProfilesFromAuthUsers(admin);
  const { data } = await admin
    .from("profiles")
    .select("id,display_name,role,plan_tier,ai_credits,copy_credits,image_credits,poster_credits,is_banned,banned_at,ban_reason,created_at")
    .order("created_at", { ascending: false });

  const rows = ((data ?? []) as MemberRow[]).filter((row) => {
    if (status === "banned" && !row.is_banned) return false;
    if (status === "active" && row.is_banned) return false;
    if (!q) return true;
    const haystack = `${row.display_name ?? ""} ${row.id} ${row.plan_tier}`.toLowerCase();
    return haystack.includes(q);
  });

  const bannedCount = rows.filter((r) => r.is_banned).length;

  return (
    <main className="min-h-screen bg-bb-bg px-6 py-6 text-bb-text">
      <div className="mx-auto w-full max-w-[1380px] space-y-6">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t(lang, "admin.member_management")}</h1>
              <p className="mt-2 text-sm text-white/65">{t(lang, "admin.member_desc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/plan-requests" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.plan_reviews")}
              </Link>
              <Link href="/admin/announcements" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.announcements")}
              </Link>
              <Link href="/admin/ai-impact" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                AI Impact
              </Link>
              <Link href="/admin/pricing" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.pricing")}
              </Link>
              <Badge variant="ai">Members {rows.length}</Badge>
              <Badge variant={bannedCount > 0 ? "cancelled" : "paid"}>Banned {bannedCount}</Badge>
              <AdminSignoutButton lang={lang} />
            </div>
          </div>
        </AppCard>

        <AppCard className="p-5">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" />
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder={t(lang, "admin.search_requests")}
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
              />
            </label>
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
            >
              <option value="all">{t(lang, "admin.all_members")}</option>
              <option value="active">{t(lang, "admin.active_only")}</option>
              <option value="banned">{t(lang, "admin.banned_only")}</option>
            </select>
            <button type="submit" className="h-10 rounded-xl bg-gradient-to-r from-[#C9A227] to-[#E2C044] px-4 text-sm font-semibold text-black hover:brightness-110">
              {t(lang, "common.apply")}
            </button>
          </form>
        </AppCard>

        <MemberManagementTable rows={rows} lang={lang} />
      </div>
    </main>
  );
}
