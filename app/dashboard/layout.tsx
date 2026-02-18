import { AppShell } from "@/components/layout/AppShell";
import { SignoutButton } from "@/components/dashboard/signout-button";
import { requireSeller } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/shop", label: "Shop" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/ai", label: "AI Marketing" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

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
  const credits = profile.copy_credits + profile.image_credits + profile.poster_credits;
  const email = user.email ?? profile.display_name ?? "seller";

  return (
    <AppShell email={email} credits={credits} initial={initials(profile.display_name)} signout={<SignoutButton />} navItems={links}>
      {children}
    </AppShell>
  );
}
