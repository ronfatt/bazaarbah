import { SidebarNav } from "@/components/dashboard/sidebar-nav";
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
  const { profile } = await requireSeller();

  return (
    <div className="min-h-screen bg-[#0B1F1A] text-[#F3F4F6]">
      <aside className="fixed inset-y-0 left-0 w-[240px] border-r border-white/5 bg-[#0E3B2E] p-4">
        <div className="mb-8 rounded-xl border border-white/10 bg-[#163C33] p-3">
          <p className="font-mono text-xs uppercase tracking-wide text-[#9CA3AF]">BazaarBah</p>
          <p className="mt-1 text-sm font-semibold text-[#F3F4F6]">Seller OS</p>
        </div>
        <SidebarNav items={links} />
      </aside>

      <div className="ml-[240px] min-h-screen">
        <header className="sticky top-0 z-20 h-16 border-b border-white/5 bg-[#112E27]">
          <div className="flex h-full items-center justify-between px-6">
            <div>
              <p className="text-sm font-semibold text-[#F3F4F6]">Welcome back, {profile.display_name ?? "Seller"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#00C2A8]/10 px-3 py-1 text-xs font-medium text-[#00C2A8]">
                AI Credits {profile.copy_credits + profile.image_credits + profile.poster_credits}
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#163C33] text-xs font-bold text-[#F3F4F6]">
                {initials(profile.display_name)}
              </div>
              <SignoutButton />
            </div>
          </div>
        </header>

        <main className="px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
