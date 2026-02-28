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
        earnings={[]}
        payouts={[]}
      />
    );
  }

  const [summary, availableToRequestCents, referralsRes, earningsRes, payoutsRes] = await Promise.all([
    getAffiliateSummary(admin, user.id),
    getAvailableAffiliatePayoutCents(admin, user.id),
    admin.from("profiles").select("id,display_name,plan_tier,created_at").eq("referred_by", user.id).order("created_at", { ascending: false }).limit(100),
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
      earnings={earnings.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        level: Number(row.level ?? 1),
        amount_cents: Number(row.amount_cents ?? 0),
        status: row.status,
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
