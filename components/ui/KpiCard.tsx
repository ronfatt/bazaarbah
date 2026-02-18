import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";

export function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: string;
  trend: number;
  icon: LucideIcon;
}) {
  const positive = trend >= 0;

  return (
    <AppCard className="bg-gradient-to-br from-bb-surface to-bb-surface2 p-6 hover:-translate-y-0.5 hover:border-bb-ai/20 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-bb-muted">{title}</p>
          <p className="mt-2 text-3xl font-bold text-bb-text">{value}</p>
        </div>
        <div className="rounded-xl border border-bb-border/10 bg-bb-brand/50 p-2">
          <Icon size={17} className="text-bb-gold" />
        </div>
      </div>
      <p className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(trend)}%
      </p>
    </AppCard>
  );
}
