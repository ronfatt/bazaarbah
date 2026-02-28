import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient<any, "public", any>;

export const AFFILIATE_REF_COOKIE = "bb_ref";
export const AFFILIATE_MIN_PAYOUT_CENTS = 10000;

export const COMMISSION_RATES = {
  PACKAGE_PURCHASE: [2500, 500, 300],
  CREDIT_TOPUP: [2500, 500, 300],
} as const;

export type AffiliateEventType = keyof typeof COMMISSION_RATES;

type AffiliateProfile = {
  id: string;
  referral_code: string | null;
  referred_by: string | null;
  referral_path: string | null;
  is_affiliate_enabled: boolean | null;
  affiliate_enabled_at: string | null;
};

export type AffiliateTeamTreeRow = {
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
};

export type AffiliateTeamTree = {
  level1: AffiliateTeamTreeRow[];
  level2: AffiliateTeamTreeRow[];
  level3: AffiliateTeamTreeRow[];
};

export function parseReferralPath(path: string | null | undefined) {
  return (path ?? "")
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function buildReferralPath(referrer: { id: string; referral_path?: string | null }) {
  return [referrer.id, ...parseReferralPath(referrer.referral_path)].slice(0, 3).join(">");
}

export async function generateUniqueReferralCode(admin: AdminClient, seed?: string) {
  const normalizedSeed = (seed ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    const code = `${normalizedSeed}${random}`.slice(0, 8) || random.slice(0, 8);
    const { data } = await admin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Unable to generate referral code");
}

export async function ensureAffiliateEnabled(admin: AdminClient, userId: string) {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id,referral_code,is_affiliate_enabled,affiliate_enabled_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(error?.message ?? "Profile not found");
  }

  if (profile.is_affiliate_enabled && profile.referral_code) {
    return profile;
  }

  const referralCode = profile.referral_code ?? (await generateUniqueReferralCode(admin, userId.replace(/-/g, "").slice(0, 4)));
  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("profiles")
    .update({
      is_affiliate_enabled: true,
      affiliate_enabled_at: profile.affiliate_enabled_at ?? now,
      referral_code: referralCode,
    })
    .eq("id", userId)
    .select("id,referral_code,is_affiliate_enabled,affiliate_enabled_at")
    .single();

  if (updateErr || !updated) {
    throw new Error(updateErr?.message ?? "Failed to enable affiliate");
  }

  return updated;
}

export async function bindReferralIfEligible(admin: AdminClient, buyerId: string, referralCodeRaw?: string | null) {
  const referralCode = referralCodeRaw?.trim().toUpperCase();
  if (!referralCode) return null;

  const { data: buyer, error: buyerErr } = await admin
    .from("profiles")
    .select("id,referred_by")
    .eq("id", buyerId)
    .maybeSingle();
  if (buyerErr || !buyer || buyer.referred_by) return buyer ?? null;

  const { data: referrer } = await admin
    .from("profiles")
    .select("id,referral_path")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (!referrer?.id || referrer.id === buyerId) return buyer;

  const referralPath = buildReferralPath(referrer);
  const { data: updated } = await admin
    .from("profiles")
    .update({ referred_by: referrer.id, referral_path: referralPath })
    .eq("id", buyerId)
    .is("referred_by", null)
    .select("id,referred_by,referral_path")
    .single();

  return updated ?? buyer;
}

export async function createAffiliateEventAndLedger(
  admin: AdminClient,
  input: {
    buyerId: string;
    shopId?: string | null;
    eventType: AffiliateEventType;
    amountCents: number;
    packageCode?: "P88" | "P168" | null;
    topupCode?: "T50" | null;
    externalRef: string;
  },
) {
  const existing = await admin.from("affiliate_events").select("id").eq("external_ref", input.externalRef).maybeSingle();
  if (existing.data?.id) {
    return { eventId: existing.data.id, created: false };
  }

  const { data: buyer, error: buyerErr } = await admin
    .from("profiles")
    .select("id,referred_by,referral_path")
    .eq("id", input.buyerId)
    .maybeSingle();
  if (buyerErr || !buyer) {
    throw new Error(buyerErr?.message ?? "Buyer not found");
  }

  const { data: event, error: eventErr } = await admin
    .from("affiliate_events")
    .insert({
      buyer_id: input.buyerId,
      shop_id: input.shopId ?? null,
      event_type: input.eventType,
      amount_cents: input.amountCents,
      package_code: input.packageCode ?? null,
      topup_code: input.topupCode ?? null,
      external_ref: input.externalRef,
    })
    .select("id")
    .single();

  if (eventErr || !event) {
    if ((eventErr as { code?: string } | null)?.code === "23505") {
      return { eventId: null, created: false };
    }
    throw new Error(eventErr?.message ?? "Failed to create affiliate event");
  }

  const uplineIds = parseReferralPath(buyer.referral_path);
  if (!uplineIds.length) {
    return { eventId: event.id, created: true };
  }

  const { data: uplines, error: uplineErr } = await admin
    .from("profiles")
    .select("id,is_affiliate_enabled")
    .in("id", uplineIds);

  if (uplineErr) {
    throw new Error(uplineErr.message);
  }

  const enabledMap = new Map<string, boolean>((uplines ?? []).map((row) => [row.id, Boolean(row.is_affiliate_enabled)]));
  const ledgerRows = uplineIds
    .slice(0, 3)
    .map((uplineId, index) => {
      if (!enabledMap.get(uplineId)) return null;
      const rateBps = COMMISSION_RATES[input.eventType][index];
      const amountCents = Math.floor((input.amountCents * rateBps) / 10000);
      if (amountCents <= 0) return null;
      return {
        event_id: event.id,
        earner_id: uplineId,
        buyer_id: input.buyerId,
        level: index + 1,
        rate_bps: rateBps,
        amount_cents: amountCents,
        status: "PENDING",
      };
    })
    .filter(Boolean);

  if (ledgerRows.length) {
    const { error: ledgerErr } = await admin.from("commission_ledger").insert(ledgerRows);
    if (ledgerErr) {
      throw new Error(ledgerErr.message);
    }
  }

  return { eventId: event.id, created: true };
}

export async function getAffiliateSummary(admin: AdminClient, userId: string) {
  const [{ data: ledgerRows }, { data: directRows }, { data: teamRows }] = await Promise.all([
    admin.from("commission_ledger").select("amount_cents,status").eq("earner_id", userId),
    admin.from("profiles").select("id").eq("referred_by", userId),
    admin.from("profiles").select("id,referral_path").like("referral_path", `%${userId}%`),
  ]);

  const summary = { pending: 0, approved: 0, paid: 0 };
  for (const row of ledgerRows ?? []) {
    if (row.status === "PENDING") summary.pending += Number(row.amount_cents ?? 0);
    if (row.status === "APPROVED") summary.approved += Number(row.amount_cents ?? 0);
    if (row.status === "PAID") summary.paid += Number(row.amount_cents ?? 0);
  }

  const teamIds = new Set<string>();
  for (const row of teamRows ?? []) {
    const path = parseReferralPath(row.referral_path);
    if (path.includes(userId) && row.id !== userId) teamIds.add(row.id);
  }

  return {
    ...summary,
    directCount: Number(directRows?.length ?? 0),
    teamCount: teamIds.size,
  };
}

export async function getAvailableAffiliatePayoutCents(admin: AdminClient, userId: string) {
  const [{ data: ledgerRows }, { data: payoutRows }] = await Promise.all([
    admin.from("commission_ledger").select("amount_cents,status").eq("earner_id", userId).eq("status", "APPROVED"),
    admin.from("payout_requests").select("amount_cents,status").eq("user_id", userId).in("status", ["REQUESTED", "APPROVED", "PAID"]),
  ]);

  const approved = (ledgerRows ?? []).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const reserved = (payoutRows ?? []).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  return Math.max(0, approved - reserved);
}

export async function getAffiliateTeamTree(admin: AdminClient, userId: string, rootDisplayName?: string | null): Promise<AffiliateTeamTree> {
  const [teamRes, earningsRes, eventsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id,display_name,plan_tier,created_at,referred_by,referral_path,is_affiliate_enabled")
      .like("referral_path", `%${userId}%`)
      .order("created_at", { ascending: false })
      .limit(300),
    admin.from("commission_ledger").select("buyer_id,amount_cents,created_at,event_id").eq("earner_id", userId),
    admin.from("affiliate_events").select("id,event_type"),
  ]);

  const teamRows = (teamRes.data ?? []) as Array<{
    id: string;
    display_name: string | null;
    plan_tier: "free" | "pro_88" | "pro_128";
    created_at: string;
    referred_by: string | null;
    referral_path: string | null;
    is_affiliate_enabled: boolean | null;
  }>;
  const earnings = earningsRes.data ?? [];
  const eventMap = new Map((eventsRes.data ?? []).map((row) => [row.id, row.event_type]));
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

  const level1: AffiliateTeamTreeRow[] = [];
  const level2: AffiliateTeamTreeRow[] = [];
  const level3: AffiliateTeamTreeRow[] = [];

  for (const row of teamRows) {
    const path = parseReferralPath(row.referral_path);
    const index = path.indexOf(userId);
    if (index === -1) continue;
    const item: AffiliateTeamTreeRow = {
      id: row.id,
      display_name: row.display_name,
      plan_tier: row.plan_tier,
      created_at: row.created_at,
      parent_id: row.referred_by,
      is_affiliate_enabled: Boolean(row.is_affiliate_enabled),
      parent_name: row.referred_by ? teamMap.get(row.referred_by)?.display_name ?? (row.referred_by === userId ? rootDisplayName ?? null : null) : null,
      children_count: childCountMap.get(row.id) ?? 0,
      contributed_cents: contributionMap.get(row.id) ?? 0,
      last_contribution_at: lastContributionMap.get(row.id) ?? null,
      package_count: packageCountMap.get(row.id) ?? 0,
      topup_count: topupCountMap.get(row.id) ?? 0,
    };
    if (index === 0) level1.push(item);
    if (index === 1) level2.push(item);
    if (index === 2) level3.push(item);
  }

  return { level1, level2, level3 };
}
