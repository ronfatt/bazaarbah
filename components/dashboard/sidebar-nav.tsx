"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center rounded-xl px-3 py-2 text-sm font-medium text-[#9CA3AF] transition-all duration-200 hover:translate-x-1 hover:bg-white/5 hover:text-[#F3F4F6]",
              active && "border-l-[3px] border-[#C9A227] bg-[#163C33] text-[#F3F4F6]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
