import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasUnlockedFeatures, normalizePlanTier } from "@/lib/plan";

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
      copy_credits: 0,
      image_credits: 0,
      poster_credits: 0,
    };

    const firstTry = await admin
      .from("profiles")
      .upsert(
        {
          ...seed,
          plan_tier: "free",
        },
        { onConflict: "id" },
      )
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
    throw new Error("Plan upgrade required. Please submit your payment slip in Billing.");
  }
}

export async function assertUnlockedByUserId(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,plan,role,is_banned").eq("id", userId).maybeSingle();
  if (!profile) {
    throw new Error("Profile not found");
  }
  if (profile.is_banned) {
    throw new Error("Account is banned. Contact support.");
  }
  assertUnlocked(profile);
}

export async function assertAdminByUserId(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,role").eq("id", userId).maybeSingle();
  if (!profile || profile.role !== "admin") {
    throw new Error("Admin access required");
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
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }
  return { user, profile };
}

export async function requireAdminPortalUser() {
  const { user, profile } = await requireSeller({ loginPath: "/admin/auth" });
  if (profile.role !== "admin") {
    redirect("/admin/auth?error=not_admin");
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
