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
    <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#112E27] to-[#163C33] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00C2A8]/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#9CA3AF]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#F3F4F6]">{value}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#0E3B2E] p-2">
          <Icon size={17} className="text-[#C9A227]" />
        </div>
      </div>
      <p className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(trend)}% vs yesterday
      </p>
    </div>
  );
}
