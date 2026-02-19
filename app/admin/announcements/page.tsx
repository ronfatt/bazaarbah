import Link from "next/link";
import { Bell } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { AdminSignoutButton } from "@/components/admin/admin-signout-button";
import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { requireAdminPortalUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
};

export default async function AdminAnnouncementsPage() {
  const lang = await getLangFromCookie();
  await requireAdminPortalUser();
  const admin = createAdminClient();
  const { data } = await admin
    .from("member_notices")
    .select("id,title,body,is_active,created_at")
    .eq("scope", "all")
    .eq("type", "announcement")
    .order("created_at", { ascending: false });

  const announcements = (data ?? []) as Announcement[];

  return (
    <main className="min-h-screen bg-bb-bg px-6 py-6 text-bb-text">
      <div className="mx-auto w-full max-w-[1180px] space-y-6">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t(lang, "admin.announcement_center")}</h1>
              <p className="mt-2 text-sm text-white/65">{t(lang, "admin.announcement_desc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/plan-requests" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.plan_reviews")}
              </Link>
              <Link href="/admin/members" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.members")}
              </Link>
              <Link href="/admin/pricing" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                {t(lang, "admin.pricing")}
              </Link>
              <Link href="/admin/ai-impact" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                AI Impact
              </Link>
              <Badge variant="ai">
                <Bell size={13} className="mr-1" /> {announcements.filter((a) => a.is_active).length} {t(lang, "admin.active_count")}
              </Badge>
              <AdminSignoutButton lang={lang} />
            </div>
          </div>
        </AppCard>

        <AnnouncementManager announcements={announcements} lang={lang} />
      </div>
    </main>
  );
}
