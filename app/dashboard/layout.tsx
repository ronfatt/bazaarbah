import { AppShell } from "@/components/layout/AppShell";
import { SignoutButton } from "@/components/dashboard/signout-button";
import { requireSeller } from "@/lib/auth";
import { normalizePlanTier, PLAN_LABEL, totalAiCredits } from "@/lib/plan";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/shop", label: "Shop" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/ai", label: "AI Marketing" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];
const adminLinks = [{ href: "/dashboard/admin/plan-requests", label: "Plan Reviews" }];

function initials(name: string | null) {
  if (!name) return "SB";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireSeller();
  const tier = normalizePlanTier(profile);
  const credits = totalAiCredits(profile);
  const email = user.email ?? profile.display_name ?? "seller";
  const baseNav = tier === "free" ? links.filter((link) => link.href === "/dashboard" || link.href === "/dashboard/billing") : links;
  const navItems = profile.role === "admin" ? [...baseNav, ...adminLinks] : baseNav;
  const planLabel = tier === "free" ? "Free" : `${PLAN_LABEL[tier]} • Active`;

  return (
    <AppShell
      email={email}
      credits={credits}
      planLabel={planLabel}
      initial={initials(profile.display_name)}
      signout={<SignoutButton />}
      navItems={navItems}
    >
      {children}
    </AppShell>
  );
}
