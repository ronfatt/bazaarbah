import Link from "next/link";
import { requireSeller } from "@/lib/auth";
import { SignoutButton } from "@/components/dashboard/signout-button";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/shop", label: "Shop" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/ai", label: "AI" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSeller();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div>
          <p className="font-mono text-xs text-neutral-500">Raya Seller Platform</p>
          <p className="text-lg font-semibold text-neutral-900">{profile.display_name ?? "Seller"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
              {link.label}
            </Link>
          ))}
        </div>
        <SignoutButton />
      </header>
      {children}
    </main>
  );
}
