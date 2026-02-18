export type PlanTier = "free" | "pro_88" | "pro_128";

export const PLAN_PRICE_CENTS: Record<PlanTier, number> = {
  free: 0,
  pro_88: 8800,
  pro_128: 12800,
};

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  pro_88: "RM88",
  pro_128: "RM128",
};

export const PLAN_AI_CREDITS: Record<PlanTier, { copy: number; image: number; poster: number }> = {
  free: { copy: 0, image: 0, poster: 0 },
  pro_88: { copy: 20, image: 6, poster: 3 },
  pro_128: { copy: 50, image: 15, poster: 6 },
};

type ProfileLike = {
  plan_tier?: string | null;
  plan?: string | null;
  copy_credits?: number | null;
  image_credits?: number | null;
  poster_credits?: number | null;
};

export function normalizePlanTier(profile: ProfileLike): PlanTier {
  if (profile.plan_tier === "pro_88" || profile.plan_tier === "pro_128" || profile.plan_tier === "free") {
    return profile.plan_tier;
  }
  return profile.plan === "pro" ? "pro_88" : "free";
}

export function isPaidTier(tier: PlanTier) {
  return tier === "pro_88" || tier === "pro_128";
}

export function hasUnlockedFeatures(profile: ProfileLike) {
  return isPaidTier(normalizePlanTier(profile));
}

export function totalAiCredits(profile: ProfileLike) {
  return Number(profile.copy_credits ?? 0) + Number(profile.image_credits ?? 0) + Number(profile.poster_credits ?? 0);
}

