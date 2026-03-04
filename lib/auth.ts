import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bindReferralIfEligible } from "@/lib/affiliate";
import { hasUnlockedFeatures, normalizePlanTier } from "@/lib/plan";

type ProfileAccess = {
  id: string;
  plan: string | null;
  plan_tier: string | null;
  role: string | null;
  admin_role: string | null;
  is_banned: boolean | null;
};

export type AdminRole = "super_admin" | "finance" | "marketing";
export type AdminPermission = "super_admin" | "finance" | "marketing";

function normalizeAdminRole(role: string | null | undefined): AdminRole | null {
  if (role === "super_admin" || role === "finance" || role === "marketing") return role;
  return null;
}

function hasAdminPermission(profile: { role?: string | null; admin_role?: string | null }, permission?: AdminPermission) {
  if (profile.role !== "admin") return false;
  const adminRole = normalizeAdminRole(profile.admin_role);
  if (!permission) return true;
  if (adminRole === "super_admin") return true;
  return adminRole === permission;
}

export function getAdminHomePath(profile: { role?: string | null; admin_role?: string | null }) {
  const adminRole = normalizeAdminRole(profile.admin_role);
  if (adminRole === "marketing") return "/admin/announcements";
  if (adminRole === "finance") return "/admin/plan-requests";
  return "/admin/members";
}

export async function requireSeller(options?: { loginPath?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(options?.loginPath ?? "/auth");
  }

  const admin = createAdminClient();
  let { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!profile) {
    const seed = {
      id: user.id,
      display_name: user.email ?? "Seller",
      plan: "basic",
      plan_tier: "free",
      ai_credits: 10,
      copy_credits: 0,
      image_credits: 0,
      poster_credits: 0,
      is_affiliate_enabled: false,
    };

    const firstTry = await admin
      .from("profiles")
      .upsert(seed, { onConflict: "id" })
      .select("*")
      .single();

    if (firstTry.error) {
      const fallback = await admin.from("profiles").upsert(seed, { onConflict: "id" }).select("*").single();
      profile = fallback.data;
    } else {
      profile = firstTry.data;
    }
  }

  if (!profile.plan_tier) {
    const tier = normalizePlanTier(profile);
    const { data } = await admin.from("profiles").update({ plan_tier: tier }).eq("id", user.id).select("*").single();
    if (data) profile = data;
  }

  const referralInput = (user.user_metadata?.referral_code as string | undefined)?.trim().toUpperCase();
  if (!profile.referred_by && referralInput) {
    const bound = await bindReferralIfEligible(admin, user.id, referralInput);
    if (bound) {
      const { data } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) profile = data;
    }
  }

  if (profile.is_banned) {
    if (options?.loginPath === "/admin/auth") {
      redirect("/admin/auth?error=banned");
    }
    redirect("/auth?error=banned");
  }

  return { user, profile };
}

export function assertUnlocked(profile: { plan_tier?: string | null; plan?: string | null }) {
  if (!hasUnlockedFeatures(profile)) {
    throw new Error("Plan upgrade required. Free members are view-only for now. You can still use AI Marketing and Billing.");
  }
}

async function getProfileAccessByUserId(userId: string): Promise<ProfileAccess> {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,plan,plan_tier,role,admin_role,is_banned").eq("id", userId).maybeSingle();
  if (!profile) {
    throw new Error("Profile not found");
  }
  return profile as ProfileAccess;
}

export async function assertActiveSellerByUserId(userId: string) {
  const profile = await getProfileAccessByUserId(userId);
  if (profile.is_banned) {
    throw new Error("Account is banned. Contact support.");
  }
}

export async function assertUnlockedByUserId(userId: string) {
  const profile = await getProfileAccessByUserId(userId);
  if (profile.is_banned) {
    throw new Error("Account is banned. Contact support.");
  }
  assertUnlocked(profile);
}

export async function assertAdminByUserId(userId: string, permission?: AdminPermission) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,role,admin_role").eq("id", userId).maybeSingle();
  if (!profile || !hasAdminPermission(profile, permission)) {
    throw new Error(permission ? "Admin permission required" : "Admin access required");
  }
}

export async function requireUnlockedSeller() {
  const session = await requireSeller();
  if (!hasUnlockedFeatures(session.profile)) {
    redirect("/dashboard/billing");
  }
  return session;
}

export async function requireAdminUser() {
  const { user, profile } = await requireSeller();
  if (!hasAdminPermission(profile)) {
    redirect("/dashboard");
  }
  return { user, profile };
}

export async function requireAdminPortalUser(permission?: AdminPermission) {
  const { user, profile } = await requireSeller({ loginPath: "/admin/auth" });
  if (profile.role !== "admin") {
    redirect("/admin/auth?error=not_admin");
  }
  if (!hasAdminPermission(profile, permission)) {
    redirect(getAdminHomePath(profile));
  }
  return { user, profile };
}

export async function getOptionalUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
