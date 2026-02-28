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

export default async function AdminAffiliatePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; userId?: string }>;
}) {
  const lang = await getLangFromCookie();
  await requireAdminPortalUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const selectedUserId = (params.userId ?? "").trim();
  const admin = createAdminClient();
  const monthIso = startOfMonthIso();

  const [ledgerRes, payoutsRes, profilesRes] = await Promise.all([
    admin.from("commission_ledger").select("id,created_at,status,level,amount_cents,event_id,earner_id,buyer_id").order("created_at", { ascending: false }).limit(150),
    admin.from("payout_requests").select("id,created_at,status,amount_cents,user_id,bank_info_json").order("created_at", { ascending: false }).limit(100),
    admin.from("profiles").select("id,display_name"),
  ]);

  const ledger = ledgerRes.data ?? [];
  const payouts = payoutsRes.data ?? [];
  const profileMap = new Map((profilesRes.data ?? []).map((row) => [row.id, row.display_name]));
  const eventIds = Array.from(new Set(ledger.map((row) => row.event_id).filter(Boolean)));
  const eventsRes = eventIds.length ? await admin.from("affiliate_events").select("id,event_type").in("id", eventIds) : { data: [], error: null };
  const eventMap = new Map((eventsRes.data ?? []).map((row) => [row.id, row.event_type]));

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

  const profilesSearchRes = await admin
    .from("profiles")
    .select("id,display_name,plan_tier,is_affiliate_enabled,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const searchRows = (profilesSearchRes.data ?? []).filter((row) => {
    if (!q) return false;
    const haystack = `${row.id} ${row.display_name ?? ""}`.toLowerCase();
    return haystack.includes(q);
  }).slice(0, 20);
  const selectedProfile = selectedUserId
    ? (profilesSearchRes.data ?? []).find((row) => row.id === selectedUserId) ??
      (await admin.from("profiles").select("id,display_name,plan_tier,is_affiliate_enabled,created_at").eq("id", selectedUserId).maybeSingle()).data
    : null;
  const selectedTeamTree = selectedProfile ? await getAffiliateTeamTree(admin, selectedProfile.id, selectedProfile.display_name ?? null) : null;

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
                          <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.current_plan")}: {row.plan_tier === "free" ? t(lang, "plan.free") : row.plan_tier === "pro_88" ? "RM88" : "RM168"}</p>
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
