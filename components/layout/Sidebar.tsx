"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string };

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const base = "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition";
  const inactive = "text-white/45 hover:text-bb-text hover:bg-bb-surface/40";
  const activeCls = "bg-bb-surface2/70 text-bb-text border border-bb-ai/15 shadow-glowAI";

  return (
    <Link href={item.href} className={cn(base, active ? activeCls : inactive)}>
      {item.label}
    </Link>
  );
}

export function Sidebar({ items, planLabel }: { items: Item[]; planLabel: string }) {
  const pathname = usePathname();

  return (
    <div className="p-4 flex h-full flex-col gap-4">
      <div className="rounded-2xl bg-bb-surface/50 border border-bb-border/5 p-4 shadow-soft">
        <div className="text-xs text-white/45 tracking-widest">BAZAARBAH</div>
        <div className="text-lg font-semibold">Seller OS</div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <NavItem key={item.href} item={item} active={active} />;
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-bb-surface/40 border border-bb-border/5 p-3">
        <div className="text-xs text-white/45">Plan</div>
        <div className="text-sm text-white/65">{planLabel}</div>
      </div>
    </div>
  );
}
