import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { AdminSignoutButton } from "@/components/admin/admin-signout-button";
import { PricingManager } from "@/components/admin/pricing-manager";
import { requireAdminPortalUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanPriceRow } from "@/lib/plan";

export default async function AdminPricingPage() {
  await requireAdminPortalUser();
  const admin = createAdminClient();
  const { data } = await admin
    .from("plan_prices")
    .select("plan_tier,list_price_cents,promo_price_cents,promo_active,promo_start_at,promo_end_at")
    .order("plan_tier", { ascending: true });

  return (
    <main className="min-h-screen bg-bb-bg px-6 py-6 text-bb-text">
      <div className="mx-auto w-full max-w-[1180px] space-y-6">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Pricing Control</h1>
              <p className="mt-2 text-sm text-white/65">Configure list price and promo price shown in billing.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/plan-requests" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Plan Reviews
              </Link>
              <Link href="/admin/members" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Members
              </Link>
              <Link href="/admin/announcements" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Announcements
              </Link>
              <Badge variant="ai">Pricing</Badge>
              <AdminSignoutButton />
            </div>
          </div>
        </AppCard>

        <PricingManager initialPrices={(data ?? []) as PlanPriceRow[]} />
      </div>
    </main>
  );
}
