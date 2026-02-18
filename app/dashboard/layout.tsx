import { AppShell } from "@/components/layout/AppShell";
import { SignoutButton } from "@/components/dashboard/signout-button";
import { requireSeller } from "@/lib/auth";
import { normalizePlanTier, PLAN_LABEL, totalAiCredits } from "@/lib/plan";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

function links(lang: Awaited<ReturnType<typeof getLangFromCookie>>) {
  return [
    { href: "/dashboard", label: t(lang, "nav.dashboard") },
    { href: "/dashboard/shop", label: t(lang, "nav.shop") },
    { href: "/dashboard/products", label: t(lang, "nav.products") },
    { href: "/dashboard/orders", label: t(lang, "nav.orders") },
    { href: "/dashboard/ai", label: t(lang, "nav.ai") },
    { href: "/dashboard/billing", label: t(lang, "nav.billing") },
    { href: "/dashboard/settings", label: t(lang, "nav.settings") },
  ];
}
function adminLinks(lang: Awaited<ReturnType<typeof getLangFromCookie>>) {
  return [{ href: "/dashboard/admin/plan-requests", label: t(lang, "nav.plan_reviews") }];
}

function initials(name: string | null) {
  if (!name) return "SB";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLangFromCookie();
  const { user, profile } = await requireSeller();
  const tier = normalizePlanTier(profile);
  const credits = totalAiCredits(profile);
  const email = user.email ?? profile.display_name ?? "seller";
  const linkList = links(lang);
  const baseNav = tier === "free" ? linkList.filter((link) => link.href === "/dashboard" || link.href === "/dashboard/billing") : linkList;
  const navItems = profile.role === "admin" ? [...baseNav, ...adminLinks(lang)] : baseNav;
  const planLabel = tier === "free" ? t(lang, "plan.free") : `${PLAN_LABEL[tier]} • ${t(lang, "plan.active")}`;

  return (
    <AppShell
      email={email}
      credits={credits}
      planLabel={planLabel}
      lang={lang}
      initial={initials(profile.display_name)}
      signout={<SignoutButton />}
      navItems={navItems}
      i18n={{
        welcome: t(lang, "topbar.welcome"),
        aiCredits: t(lang, "topbar.ai_credits"),
        langEn: t(lang, "lang.en"),
        langZh: t(lang, "lang.zh"),
        langMs: t(lang, "lang.ms"),
        plan: t(lang, "sidebar.plan"),
        sellerOs: t(lang, "sidebar.seller_os"),
      }}
    >
      {children}
    </AppShell>
  );
}
