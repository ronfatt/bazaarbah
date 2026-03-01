"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { t, type Lang } from "@/lib/i18n";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-MY").format(value);
}

export function PlatformPulse({
  lang = "ms",
  totalMerchants = 142,
  totalUsers = 230,
  activeBase = 100,
}: {
  lang?: Lang;
  totalMerchants?: number;
  totalUsers?: number;
  activeBase?: number;
}) {
  const [activeNow, setActiveNow] = useState(activeBase);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveNow((current) => {
        const swing = Math.floor(Math.random() * 7) - 3;
        const next = current + swing;
        return Math.min(activeBase + 12, Math.max(activeBase - 8, next));
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, [activeBase]);

  const cards = useMemo(
    () => [
      { label: t(lang, "home.stats_total_merchants"), value: formatCount(totalMerchants), tone: "text-[#F4D35E]" },
      { label: t(lang, "home.stats_total_users"), value: formatCount(totalUsers), tone: "text-white" },
      { label: t(lang, "home.stats_active"), value: formatCount(activeNow), tone: "text-[#49E3B1]" },
    ],
    [lang, totalMerchants, totalUsers, activeNow],
  );

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="ai">{t(lang, "home.stats_badge")}</Badge>
          </div>
          <p className="mt-2 text-sm text-white/65">{t(lang, "home.stats_desc")}</p>
        </div>
        <div className="flex h-3 w-3 rounded-full bg-[#49E3B1] shadow-[0_0_18px_rgba(73,227,177,0.85)]" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-white/45">{t(lang, "home.stats_active_note")}</p>
    </div>
  );
}
