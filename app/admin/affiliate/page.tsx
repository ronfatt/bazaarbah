import Link from "next/link";
import { AffiliateAdminPanel } from "@/components/admin/affiliate-admin-panel";
import { AdminSignoutButton } from "@/components/admin/admin-signout-button";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { requireAdminPortalUser } from "@/lib/auth";
import { getAffiliateTeamTree } from "@/lib/affiliate";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents, formatDateMY, formatDateTimeMY } from "@/lib/utils";

function startOfMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

function formatPlanTier(lang: "en" | "zh" | "ms", planTier: "free" | "pro_88" | "pro_128") {
  if (planTier === "free") return t(lang, "plan.free");
  if (planTier === "pro_88") return "RM88";
  return "RM168";
}

export default async function AdminAffiliatePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; userId?: string }>;
}) {
  const lang = await getLangFromCookie();
  await requireAdminPortalUser("finance");
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const selectedUserId = (params.userId ?? "").trim();
  const admin = createAdminClient();
  const monthIso = startOfMonthIso();

  const [ledgerRes, payoutsRes, profilesRes, allProfilesRes] = await Promise.all([
    admin.from("commission_ledger").select("id,created_at,status,level,amount_cents,event_id,earner_id,buyer_id").order("created_at", { ascending: false }).limit(150),
    admin.from("payout_requests").select("id,created_at,status,amount_cents,user_id,bank_info_json").order("created_at", { ascending: false }).limit(100),
    admin.from("profiles").select("id,display_name"),
    admin
      .from("profiles")
      .select("id,display_name,plan_tier,is_affiliate_enabled,created_at,referred_by,referral_path")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const ledger = ledgerRes.data ?? [];
  const payouts = payoutsRes.data ?? [];
  const profileMap = new Map((profilesRes.data ?? []).map((row) => [row.id, row.display_name]));
  const allProfiles = allProfilesRes.data ?? [];
  const eventIds = Array.from(new Set(ledger.map((row) => row.event_id).filter(Boolean)));
  const [eventsRes, allEventsRes] = await Promise.all([
    eventIds.length ? await admin.from("affiliate_events").select("id,event_type").in("id", eventIds) : { data: [], error: null },
    admin
      .from("affiliate_events")
      .select("id,event_type,buyer_id,created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  const eventMap = new Map((eventsRes.data ?? []).map((row) => [row.id, row.event_type]));
  const allEvents = allEventsRes.data ?? [];

  const allPending = ledger.filter((row) => row.status === "PENDING").reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const allApproved = ledger.filter((row) => row.status === "APPROVED").reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const allPaid = ledger.filter((row) => row.status === "PAID").reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const monthPending = ledger.filter((row) => row.status === "PENDING" && row.created_at >= monthIso).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const monthApproved = ledger.filter((row) => row.status === "APPROVED" && row.created_at >= monthIso).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const monthPaid = ledger.filter((row) => row.status === "PAID" && row.created_at >= monthIso).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);

  const topAffiliateMap = new Map<string, number>();
  for (const row of ledger) {
    if ((row.status === "APPROVED" || row.status === "PAID") && row.created_at >= monthIso) {
      topAffiliateMap.set(row.earner_id, (topAffiliateMap.get(row.earner_id) ?? 0) + Number(row.amount_cents ?? 0));
    }
  }
  const topAffiliates = Array.from(topAffiliateMap.entries())
    .map(([id, amount]) => ({ id, amount, name: profileMap.get(id) ?? null }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const payoutToday = payouts.filter((row) => row.created_at >= monthIso).length;

  const searchRows = allProfiles.filter((row) => {
    if (!q) return false;
    const haystack = `${row.id} ${row.display_name ?? ""}`.toLowerCase();
    return haystack.includes(q);
  }).slice(0, 20);
  const selectedProfile = selectedUserId
    ? allProfiles.find((row) => row.id === selectedUserId) ??
      (await admin.from("profiles").select("id,display_name,plan_tier,is_affiliate_enabled,created_at").eq("id", selectedUserId).maybeSingle()).data
    : null;
  const selectedTeamTree = selectedProfile ? await getAffiliateTeamTree(admin, selectedProfile.id, selectedProfile.display_name ?? null) : null;

  const directCountMap = new Map<string, number>();
  const teamCountMap = new Map<string, number>();
  const monthSignupMap = new Map<string, number>();
  for (const profile of allProfiles) {
    if (profile.referred_by) {
      directCountMap.set(profile.referred_by, (directCountMap.get(profile.referred_by) ?? 0) + 1);
    }
    const path = (profile.referral_path ?? "")
      .split(">")
      .map((part: string) => part.trim())
      .filter((part: string) => Boolean(part))
      .slice(0, 3);
    for (const affiliateId of path) {
      teamCountMap.set(affiliateId, (teamCountMap.get(affiliateId) ?? 0) + 1);
      if (profile.created_at >= monthIso) {
        monthSignupMap.set(affiliateId, (monthSignupMap.get(affiliateId) ?? 0) + 1);
      }
    }
  }

  const affiliateEnabledCount = allProfiles.filter((row) => row.is_affiliate_enabled).length;
  const boundUserCount = allProfiles.filter((row) => Boolean(row.referred_by)).length;
  const monthBoundUserCount = allProfiles.filter((row) => Boolean(row.referred_by) && row.created_at >= monthIso).length;
  const monthPaidBuyerCount = new Set(allEvents.filter((row) => row.created_at >= monthIso).map((row) => row.buyer_id)).size;

  const conversionMap = new Map<string, {
    id: string;
    name: string | null;
    planTier: "free" | "pro_88" | "pro_128";
    isAffiliateEnabled: boolean;
    joinedAt: string;
    directCount: number;
    teamCount: number;
    signupCount: number;
    packageCount: number;
    topupCount: number;
    approvedCents: number;
    paidCents: number;
    reversedCount: number;
    paidConversionCount: number;
  }>();

  for (const profile of allProfiles) {
    conversionMap.set(profile.id, {
      id: profile.id,
      name: profile.display_name,
      planTier: profile.plan_tier,
      isAffiliateEnabled: Boolean(profile.is_affiliate_enabled),
      joinedAt: profile.created_at,
      directCount: directCountMap.get(profile.id) ?? 0,
      teamCount: teamCountMap.get(profile.id) ?? 0,
      signupCount: monthSignupMap.get(profile.id) ?? 0,
      packageCount: 0,
      topupCount: 0,
      approvedCents: 0,
      paidCents: 0,
      reversedCount: 0,
      paidConversionCount: 0,
    });
  }

  const allLedgerRes = await admin
    .from("commission_ledger")
    .select("id,created_at,status,amount_cents,event_id,earner_id")
    .order("created_at", { ascending: false })
    .limit(5000);
  const allLedger = allLedgerRes.data ?? [];
  const allEventTypeMap = new Map(allEvents.map((row) => [row.id, row.event_type]));
  for (const row of allLedger) {
    const item = conversionMap.get(row.earner_id);
    if (!item) continue;
    const eventType = allEventTypeMap.get(row.event_id);
    if (eventType === "PACKAGE_PURCHASE") item.packageCount += 1;
    if (eventType === "CREDIT_TOPUP") item.topupCount += 1;
    if (row.status === "APPROVED" || row.status === "PAID") item.paidConversionCount += 1;
    if (row.status === "APPROVED") item.approvedCents += Number(row.amount_cents ?? 0);
    if (row.status === "PAID") item.paidCents += Number(row.amount_cents ?? 0);
    if (row.status === "REVERSED") item.reversedCount += 1;
  }

  const conversionRows = Array.from(conversionMap.values())
    .filter((row) => row.isAffiliateEnabled || row.directCount > 0 || row.teamCount > 0 || row.packageCount > 0 || row.topupCount > 0 || row.approvedCents > 0 || row.paidCents > 0)
    .sort((a, b) => (b.approvedCents + b.paidCents) - (a.approvedCents + a.paidCents) || b.teamCount - a.teamCount)
    .slice(0, 30);

  const topPaidConversions = [...conversionRows]
    .sort((a, b) => b.paidConversionCount - a.paidConversionCount || (b.paidCents + b.approvedCents) - (a.paidCents + a.approvedCents))
    .slice(0, 8);

  const topTeamGrowth = [...conversionRows]
    .sort((a, b) => b.signupCount - a.signupCount || b.teamCount - a.teamCount)
    .slice(0, 8);

  const payoutRejectMap = new Map<string, number>();
  for (const row of payouts) {
    if (row.status === "REJECTED") {
      payoutRejectMap.set(row.user_id, (payoutRejectMap.get(row.user_id) ?? 0) + 1);
    }
  }

  const riskRows = Array.from(conversionMap.values())
    .flatMap((row) => {
      const items: Array<{ id: string; name: string | null; risk: string; detail: string; score: number }> = [];
      const payoutRejects = payoutRejectMap.get(row.id) ?? 0;
      const freeHeavy = row.teamCount >= 5 && row.packageCount === 0 && row.topupCount === 0;
      if (row.reversedCount >= 2) {
        items.push({
          id: `${row.id}:reversed`,
          name: row.name,
          risk: t(lang, "affiliate.risk_reversed"),
          detail: `${row.reversedCount} ${t(lang, "affiliate.reversed_count")}`,
          score: row.reversedCount,
        });
      }
      if (payoutRejects >= 2) {
        items.push({
          id: `${row.id}:payout`,
          name: row.name,
          risk: t(lang, "affiliate.risk_payout_rejected"),
          detail: `${payoutRejects} ${t(lang, "affiliate.rejected_count")}`,
          score: payoutRejects,
        });
      }
      if (freeHeavy) {
        items.push({
          id: `${row.id}:free-heavy`,
          name: row.name,
          risk: t(lang, "affiliate.risk_free_team"),
          detail: `${row.teamCount} ${t(lang, "affiliate.team_members_no_conversion")}`,
          score: row.teamCount,
        });
      }
      return items;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return (
    <main className="min-h-screen bg-bb-bg px-6 py-6 text-bb-text">
      <div className="mx-auto w-full max-w-[1380px] space-y-6">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t(lang, "affiliate.admin_title")}</h1>
              <p className="mt-2 text-sm text-white/65">{t(lang, "affiliate.admin_desc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/members" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">{t(lang, "admin.members")}</Link>
              <Link href="/admin/plan-requests" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">{t(lang, "admin.plan_reviews")}</Link>
              <Link href="/admin/pricing" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">{t(lang, "admin.pricing")}</Link>
              <Badge variant="ai">{t(lang, "affiliate.title")}</Badge>
              <AdminSignoutButton lang={lang} />
            </div>
          </div>
        </AppCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AppCard className="p-5">
            <p className="text-sm text-white/60">{t(lang, "affiliate.pending")}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{currencyFromCents(allPending)}</p>
            <p className="mt-1 text-xs text-white/45">{t(lang, "affiliate.this_month")}: {currencyFromCents(monthPending)}</p>
          </AppCard>
          <AppCard className="p-5">
            <p className="text-sm text-white/60">{t(lang, "affiliate.approved")}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{currencyFromCents(allApproved)}</p>
            <p className="mt-1 text-xs text-white/45">{t(lang, "affiliate.this_month")}: {currencyFromCents(monthApproved)}</p>
          </AppCard>
          <AppCard className="p-5">
            <p className="text-sm text-white/60">{t(lang, "affiliate.paid")}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{currencyFromCents(allPaid)}</p>
            <p className="mt-1 text-xs text-white/45">{t(lang, "affiliate.this_month")}: {currencyFromCents(monthPaid)}</p>
          </AppCard>
          <AppCard className="p-5">
            <p className="text-sm text-white/60">{t(lang, "affiliate.payout_requests")}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{payouts.length}</p>
            <p className="mt-1 text-xs text-white/45">{t(lang, "affiliate.this_month")}: {payoutToday}</p>
          </AppCard>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AppCard className="p-5">
            <p className="text-sm text-white/60">{t(lang, "affiliate.enabled_users")}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{affiliateEnabledCount}</p>
            <p className="mt-1 text-xs text-white/45">{t(lang, "affiliate.total_affiliate_base")}</p>
          </AppCard>
          <AppCard className="p-5">
            <p className="text-sm text-white/60">{t(lang, "affiliate.bound_users")}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{boundUserCount}</p>
            <p className="mt-1 text-xs text-white/45">{t(lang, "affiliate.this_month")}: {monthBoundUserCount}</p>
          </AppCard>
          <AppCard className="p-5">
            <p className="text-sm text-white/60">{t(lang, "affiliate.month_paid_conversions")}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{monthPaidBuyerCount}</p>
            <p className="mt-1 text-xs text-white/45">{t(lang, "affiliate.package_and_topup_events")}</p>
          </AppCard>
          <AppCard className="p-5">
            <p className="text-sm text-white/60">{t(lang, "affiliate.risk_flags")}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{riskRows.length}</p>
            <p className="mt-1 text-xs text-white/45">{t(lang, "affiliate.admin_watchlist")}</p>
          </AppCard>
        </div>

        <AppCard className="p-5">
          <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.top_affiliates")}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {topAffiliates.map((row) => (
              <div key={row.id} className="rounded-xl border border-white/10 bg-[#163C33] p-4">
                <p className="font-semibold text-white">{row.name || row.id.slice(0, 8)}</p>
                <p className="mt-2 text-lg text-white">{currencyFromCents(row.amount)}</p>
              </div>
            ))}
            {topAffiliates.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.none")}</p> : null}
          </div>
        </AppCard>

        <div className="grid gap-4 xl:grid-cols-2">
          <AppCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.top_paid_conversions")}</h2>
              <Badge variant="neutral">{topPaidConversions.length}</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {topPaidConversions.map((row) => (
                <div key={row.id} className="rounded-xl border border-white/10 bg-[#163C33] p-4">
                  <p className="font-semibold text-white">{row.name || row.id.slice(0, 8)}</p>
                  <p className="mt-2 text-lg text-white">{row.paidConversionCount}</p>
                  <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.paid_conversion_count")}</p>
                </div>
              ))}
              {topPaidConversions.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.none")}</p> : null}
            </div>
          </AppCard>

          <AppCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.top_team_growth")}</h2>
              <Badge variant="neutral">{topTeamGrowth.length}</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {topTeamGrowth.map((row) => (
                <div key={row.id} className="rounded-xl border border-white/10 bg-[#163C33] p-4">
                  <p className="font-semibold text-white">{row.name || row.id.slice(0, 8)}</p>
                  <p className="mt-2 text-lg text-white">{row.signupCount}</p>
                  <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.month_signups")}</p>
                </div>
              ))}
              {topTeamGrowth.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.none")}</p> : null}
            </div>
          </AppCard>
        </div>

        <AppCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.conversion_table")}</h2>
              <p className="mt-1 text-sm text-white/55">{t(lang, "affiliate.conversion_desc")}</p>
            </div>
            <Badge variant="neutral">{conversionRows.length}</Badge>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="text-white/55">
                <tr>
                  <th className="px-3 py-2">{t(lang, "affiliate.member")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.current_plan")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.direct_referrals")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.team_size")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.signups")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.package_count")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.topup_count")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.approved")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.paid")}</th>
                </tr>
              </thead>
              <tbody>
                {conversionRows.map((row) => (
                  <tr key={row.id} className="border-t border-white/8">
                    <td className="px-3 py-3">
                      <div>
                        <p className="font-semibold text-white">{row.name || row.id.slice(0, 8)}</p>
                        <p className="mt-1 text-xs text-white/45">{row.id}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{formatPlanTier(lang, row.planTier)}</span>
                        <Badge variant={row.isAffiliateEnabled ? "ai" : "neutral"}>
                          {row.isAffiliateEnabled ? t(lang, "affiliate.enabled_badge") : t(lang, "affiliate.locked_badge")}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-3">{row.directCount}</td>
                    <td className="px-3 py-3">{row.teamCount}</td>
                    <td className="px-3 py-3">{row.signupCount}</td>
                    <td className="px-3 py-3">{row.packageCount}</td>
                    <td className="px-3 py-3">{row.topupCount}</td>
                    <td className="px-3 py-3 font-semibold text-white">{currencyFromCents(row.approvedCents)}</td>
                    <td className="px-3 py-3 font-semibold text-white">{currencyFromCents(row.paidCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {conversionRows.length === 0 ? <p className="mt-3 text-sm text-white/45">{t(lang, "affiliate.none")}</p> : null}
          </div>
        </AppCard>

        <AppCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.risk_flags")}</h2>
              <p className="mt-1 text-sm text-white/55">{t(lang, "affiliate.risk_desc")}</p>
            </div>
            <Badge variant="cancelled">{riskRows.length}</Badge>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="text-white/55">
                <tr>
                  <th className="px-3 py-2">{t(lang, "affiliate.member")}</th>
                  <th className="px-3 py-2">{t(lang, "affiliate.status")}</th>
                  <th className="px-3 py-2">{t(lang, "common.note")}</th>
                </tr>
              </thead>
              <tbody>
                {riskRows.map((row) => (
                  <tr key={row.id} className="border-t border-white/8">
                    <td className="px-3 py-3 font-semibold text-white">{row.name || row.id.split(":")[0].slice(0, 8)}</td>
                    <td className="px-3 py-3">
                      <Badge variant="cancelled">{row.risk}</Badge>
                    </td>
                    <td className="px-3 py-3 text-white/70">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {riskRows.length === 0 ? <p className="mt-3 text-sm text-white/45">{t(lang, "affiliate.none")}</p> : null}
          </div>
        </AppCard>

        <AppCard className="p-5">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder={t(lang, "affiliate.search_user_placeholder")}
              className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white placeholder:text-white/30"
            />
            <button type="submit" className="h-10 rounded-xl bg-gradient-to-r from-[#C9A227] to-[#E2C044] px-4 text-sm font-semibold text-black hover:brightness-110">
              {t(lang, "common.apply")}
            </button>
          </form>

          {q ? (
            <div className="mt-4 space-y-2">
              {searchRows.map((row) => (
                <Link
                  key={row.id}
                  href={`/admin/affiliate?${new URLSearchParams({ q: params.q ?? "", userId: row.id }).toString()}`}
                  className={`block rounded-xl border px-3 py-3 text-sm ${selectedUserId === row.id ? "border-bb-ai/40 bg-bb-ai/12 text-white" : "border-white/10 bg-[#163C33] text-white/80"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{row.display_name || row.id.slice(0, 8)}</span>
                    <Badge variant={row.is_affiliate_enabled ? "ai" : "neutral"}>{row.is_affiliate_enabled ? t(lang, "affiliate.enabled_badge") : t(lang, "affiliate.locked_badge")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-white/55">{row.id}</p>
                </Link>
              ))}
              {searchRows.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.none")}</p> : null}
            </div>
          ) : null}
        </AppCard>

        {selectedProfile && selectedTeamTree ? (
          <AppCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.view_tree_for")} {selectedProfile.display_name || selectedProfile.id.slice(0, 8)}</h2>
                <p className="mt-1 text-xs text-white/55">{selectedProfile.id}</p>
              </div>
              <Badge variant={selectedProfile.is_affiliate_enabled ? "ai" : "neutral"}>{selectedProfile.is_affiliate_enabled ? t(lang, "affiliate.enabled_badge") : t(lang, "affiliate.locked_badge")}</Badge>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              {([
                ["level1", t(lang, "affiliate.level_1")],
                ["level2", t(lang, "affiliate.level_2")],
                ["level3", t(lang, "affiliate.level_3")],
              ] as const).map(([key, label]) => {
                const rows = selectedTeamTree[key];
                const totalContribution = rows.reduce((sum, row) => sum + row.contributed_cents, 0);
                return (
                  <div key={key} className="rounded-2xl border border-white/10 bg-[#163C33] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-white">{label}</h3>
                      <Badge variant="neutral">{rows.length}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-white/55">{t(lang, "affiliate.total_contribution")}: {currencyFromCents(totalContribution)}</p>
                    <div className="mt-3 space-y-3">
                      {rows.map((row) => (
                        <div key={row.id} className="rounded-xl border border-white/10 bg-[#0B241F] p-3 text-sm text-white/80">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-white">{row.display_name || row.id.slice(0, 8)}</p>
                            <Badge variant={row.is_affiliate_enabled ? "ai" : "neutral"}>{row.is_affiliate_enabled ? t(lang, "affiliate.enabled_badge") : t(lang, "affiliate.locked_badge")}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.current_plan")}: {formatPlanTier(lang, row.plan_tier)}</p>
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.joined_at")}: {formatDateMY(row.created_at)}</p>
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.under")}: {row.parent_name || "-"}</p>
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.children_count")}: {row.children_count}</p>
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.contributed_commission")}: {currencyFromCents(row.contributed_cents)}</p>
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.last_contribution")}: {row.last_contribution_at ? formatDateTimeMY(row.last_contribution_at) : "-"}</p>
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.package_count")}: {row.package_count}</p>
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.topup_count")}: {row.topup_count}</p>
                        </div>
                      ))}
                      {rows.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.team_empty")}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        ) : null}

        <AffiliateAdminPanel
          lang={lang}
          ledger={ledger.map((row) => ({
            id: row.id,
            created_at: row.created_at,
            status: row.status,
            level: Number(row.level ?? 1),
            amount_cents: Number(row.amount_cents ?? 0),
            event_type: eventMap.get(row.event_id) === "CREDIT_TOPUP" ? "CREDIT_TOPUP" : "PACKAGE_PURCHASE",
            earner_name: profileMap.get(row.earner_id) ?? null,
            buyer_name: profileMap.get(row.buyer_id) ?? null,
          }))}
          payouts={payouts.map((row) => ({
            id: row.id,
            created_at: row.created_at,
            status: row.status,
            amount_cents: Number(row.amount_cents ?? 0),
            user_name: profileMap.get(row.user_id) ?? null,
            bank_info_json: row.bank_info_json,
          }))}
        />
      </div>
    </main>
  );
}
