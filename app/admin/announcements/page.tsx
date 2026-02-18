import Link from "next/link";
import { Bell } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { AdminSignoutButton } from "@/components/admin/admin-signout-button";
import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { requireAdminPortalUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
};

export default async function AdminAnnouncementsPage() {
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
              <h1 className="text-2xl font-bold">Announcement Center</h1>
              <p className="mt-2 text-sm text-white/65">Publish platform updates and policy notices to all members.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/plan-requests" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Plan Reviews
              </Link>
              <Link href="/admin/members" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Members
              </Link>
              <Badge variant="ai">
                <Bell size={13} className="mr-1" /> {announcements.filter((a) => a.is_active).length} active
              </Badge>
              <AdminSignoutButton />
            </div>
          </div>
        </AppCard>

        <AnnouncementManager announcements={announcements} />
      </div>
    </main>
  );
}

