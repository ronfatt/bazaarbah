import { AffiliateDashboard } from "@/components/dashboard/affiliate-dashboard";
import { requireSeller } from "@/lib/auth";
import { getAffiliateSummary, getAvailableAffiliatePayoutCents, AFFILIATE_MIN_PAYOUT_CENTS } from "@/lib/affiliate";
import { getLangFromCookie } from "@/lib/i18n-server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AffiliatePage() {
  const lang = await getLangFromCookie();
  const { user, profile } = await requireSeller();
  const admin = createAdminClient();

  if (!profile.is_affiliate_enabled) {
    return (
      <AffiliateDashboard
        lang={lang}
        isLocked
        referralCode={profile.referral_code}
        summary={{ pending: 0, approved: 0, paid: 0, directCount: 0, teamCount: 0 }}
        availableToRequestCents={0}
        minPayoutCents={AFFILIATE_MIN_PAYOUT_CENTS}
        referrals={[]}
        teamTree={{ level1: [], level2: [], level3: [] }}
        earnings={[]}
        payouts={[]}
      />
    );
  }

  const [summary, availableToRequestCents, referralsRes, teamRes, earningsRes, payoutsRes] = await Promise.all([
    getAffiliateSummary(admin, user.id),
    getAvailableAffiliatePayoutCents(admin, user.id),
    admin.from("profiles").select("id,display_name,plan_tier,created_at").eq("referred_by", user.id).order("created_at", { ascending: false }).limit(100),
    admin
      .from("profiles")
      .select("id,display_name,plan_tier,created_at,referred_by,referral_path,is_affiliate_enabled")
      .like("referral_path", `%${user.id}%`)
      .order("created_at", { ascending: false })
      .limit(300),
    admin.from("commission_ledger").select("id,created_at,level,amount_cents,status,event_id,buyer_id").eq("earner_id", user.id).order("created_at", { ascending: false }).limit(100),
    admin.from("payout_requests").select("id,created_at,amount_cents,status,approved_at,paid_at,bank_info_json").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const earnings = earningsRes.data ?? [];
  const eventIds = Array.from(new Set(earnings.map((row) => row.event_id).filter(Boolean)));
  const buyerIds = Array.from(new Set(earnings.map((row) => row.buyer_id).filter(Boolean)));
  const eventsRes = eventIds.length ? await admin.from("affiliate_events").select("id,event_type").in("id", eventIds) : { data: [] };
  const buyersRes = buyerIds.length ? await admin.from("profiles").select("id,display_name").in("id", buyerIds) : { data: [] };

  const eventMap = new Map((eventsRes.data ?? []).map((row) => [row.id, row.event_type]));
  const buyerMap = new Map((buyersRes.data ?? []).map((row) => [row.id, row.display_name]));
  const teamRows = (teamRes.data ?? []) as Array<{
    id: string;
    display_name: string | null;
    plan_tier: "free" | "pro_88" | "pro_128";
    created_at: string;
    referred_by: string | null;
    referral_path: string | null;
    is_affiliate_enabled: boolean | null;
  }>;
  const teamMap = new Map(teamRows.map((row) => [row.id, row]));
  const childCountMap = new Map<string, number>();
  const contributionMap = new Map<string, number>();
  const lastContributionMap = new Map<string, string>();
  const packageCountMap = new Map<string, number>();
  const topupCountMap = new Map<string, number>();
  for (const row of teamRows) {
    if (row.referred_by) {
      childCountMap.set(row.referred_by, (childCountMap.get(row.referred_by) ?? 0) + 1);
    }
  }
  for (const row of earnings) {
    contributionMap.set(row.buyer_id, (contributionMap.get(row.buyer_id) ?? 0) + Number(row.amount_cents ?? 0));
    const currentLast = lastContributionMap.get(row.buyer_id);
    if (!currentLast || new Date(row.created_at).getTime() > new Date(currentLast).getTime()) {
      lastContributionMap.set(row.buyer_id, row.created_at);
    }
    if (eventMap.get(row.event_id) === "CREDIT_TOPUP") {
      topupCountMap.set(row.buyer_id, (topupCountMap.get(row.buyer_id) ?? 0) + 1);
    } else {
      packageCountMap.set(row.buyer_id, (packageCountMap.get(row.buyer_id) ?? 0) + 1);
    }
  }
  const level1: Array<{
    id: string;
    display_name: string | null;
    plan_tier: "free" | "pro_88" | "pro_128";
    created_at: string;
    parent_id: string | null;
    is_affiliate_enabled: boolean;
    parent_name: string | null;
    children_count: number;
    contributed_cents: number;
    last_contribution_at: string | null;
    package_count: number;
    topup_count: number;
  }> = [];
  const level2: typeof level1 = [];
  const level3: typeof level1 = [];

  for (const row of teamRows) {
    const path = (row.referral_path ?? "").split(">").map((part: string) => part.trim()).filter(Boolean);
    const index = path.indexOf(user.id);
    if (index === -1) continue;
    const level = index + 1;
    const item = {
      id: row.id,
      display_name: row.display_name,
      plan_tier: row.plan_tier,
      created_at: row.created_at,
      parent_id: row.referred_by,
      is_affiliate_enabled: Boolean(row.is_affiliate_enabled),
      parent_name: row.referred_by ? teamMap.get(row.referred_by)?.display_name ?? (row.referred_by === user.id ? profile.display_name ?? null : null) : null,
      children_count: childCountMap.get(row.id) ?? 0,
      contributed_cents: contributionMap.get(row.id) ?? 0,
      last_contribution_at: lastContributionMap.get(row.id) ?? null,
      package_count: packageCountMap.get(row.id) ?? 0,
      topup_count: topupCountMap.get(row.id) ?? 0,
    };
    if (level === 1) level1.push(item);
    if (level === 2) level2.push(item);
    if (level === 3) level3.push(item);
  }

  return (
    <AffiliateDashboard
      lang={lang}
      referralCode={profile.referral_code}
      summary={summary}
      availableToRequestCents={availableToRequestCents}
      minPayoutCents={AFFILIATE_MIN_PAYOUT_CENTS}
      referrals={(referralsRes.data ?? []).map((row) => ({
        id: row.id,
        display_name: row.display_name,
        plan_tier: row.plan_tier,
        created_at: row.created_at,
      }))}
      teamTree={{ level1, level2, level3 }}
      earnings={earnings.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        level: Number(row.level ?? 1),
        amount_cents: Number(row.amount_cents ?? 0),
        status: row.status,
        buyer_id: row.buyer_id,
        event_type: eventMap.get(row.event_id) === "CREDIT_TOPUP" ? "CREDIT_TOPUP" : "PACKAGE_PURCHASE",
        buyer_name: buyerMap.get(row.buyer_id) ?? null,
      }))}
      payouts={(payoutsRes.data ?? []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        amount_cents: Number(row.amount_cents ?? 0),
        status: row.status,
        approved_at: row.approved_at,
        paid_at: row.paid_at,
        bank_info_json: row.bank_info_json,
      }))}
    />
  );
}
