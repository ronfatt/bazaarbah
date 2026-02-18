import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

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
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-sm">
      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-amber-200/50 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
        </div>
        <div className="rounded-xl bg-neutral-100 p-2">
          <Icon size={18} className="text-neutral-700" />
        </div>
      </div>
      <p className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(trend)}% vs yesterday
      </p>
    </div>
  );
}
