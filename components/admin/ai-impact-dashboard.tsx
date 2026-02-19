"use client";

import { Activity, BarChart3, TrendingUp, Users } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AppCard } from "@/components/ui/AppCard";
import { currencyFromCents } from "@/lib/utils";

type BreakdownItem = { name: string; value: number; color: string };
type ComparisonRow = { cohort: string; avgAIUsed: number; avgSalesCents: number; salesGrowthPct: number };
type SellerRow = {
  sellerId: string;
  sellerName: string;
  plan: string;
  aiUsedTotal: number;
  copyCount: number;
  enhanceCount: number;
  posterCount: number;
  orders7d: number;
  sales7dCents: number;
  salesGrowthPct: number;
  aiGrowthPct: number;
  efficiencyScore: number;
};
type FeatureEffect = { feature: string; avgSalesGrowthPct: number; users: number };

export function AIImpactDashboard({
  kpi,
  usage,
  comparison,
  sellers,
  featureEffects,
}: {
  kpi: {
    aiActiveSellers7d: number;
    totalAIActions7d: number;
    avgAIperSeller: number;
    salesGrowthAIUsers: number;
    globalEfficiencyScore: number;
  };
  usage: BreakdownItem[];
  comparison: ComparisonRow[];
  sellers: SellerRow[];
  featureEffects: FeatureEffect[];
}) {
  function scoreTone(score: number) {
    if (score >= 75) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    if (score >= 50) return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AppCard className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/65">AI Active Sellers (7d)</p>
            <Users size={14} className="text-bb-ai" />
          </div>
          <p className="mt-2 text-2xl font-bold">{kpi.aiActiveSellers7d}</p>
        </AppCard>
        <AppCard className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/65">Total AI Actions (7d)</p>
            <Activity size={14} className="text-bb-ai" />
          </div>
          <p className="mt-2 text-2xl font-bold">{kpi.totalAIActions7d}</p>
        </AppCard>
        <AppCard className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/65">Avg AI / Active Seller</p>
            <BarChart3 size={14} className="text-bb-ai" />
          </div>
          <p className="mt-2 text-2xl font-bold">{kpi.avgAIperSeller.toFixed(1)}</p>
        </AppCard>
        <AppCard className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/65">Sales Growth (AI users)</p>
            <TrendingUp size={14} className="text-bb-ai" />
          </div>
          <p className="mt-2 text-2xl font-bold">{kpi.salesGrowthAIUsers.toFixed(1)}%</p>
        </AppCard>
        <AppCard className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/65">Global Efficiency Score</p>
            <TrendingUp size={14} className="text-bb-gold" />
          </div>
          <p className="mt-2 text-2xl font-bold">{kpi.globalEfficiencyScore.toFixed(1)}</p>
        </AppCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AppCard className="p-5">
          <h3 className="text-lg font-semibold">AI Usage Breakdown (7d)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={usage} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {usage.map((u) => (
                    <Cell key={u.name} fill={u.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid gap-2 text-sm">
            {usage.map((u) => (
              <div key={u.name} className="flex items-center justify-between rounded-lg bg-[#163C33] px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.color }} />
                  {u.name}
                </span>
                <span>{u.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </AppCard>

        <AppCard className="p-5">
          <h3 className="text-lg font-semibold">AI vs Non-AI Comparison (7d)</h3>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#163C33] text-white/60">
                <tr>
                  <th className="px-3 py-2">Cohort</th>
                  <th className="px-3 py-2">Avg AI Used</th>
                  <th className="px-3 py-2">Avg Sales</th>
                  <th className="px-3 py-2">Sales Growth</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.cohort} className="border-t border-white/5">
                    <td className="px-3 py-2">{row.cohort}</td>
                    <td className="px-3 py-2">{row.avgAIUsed.toFixed(1)}</td>
                    <td className="px-3 py-2">{currencyFromCents(row.avgSalesCents)}</td>
                    <td className="px-3 py-2">{row.salesGrowthPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppCard>
      </div>

      <AppCard className="p-5">
        <h3 className="text-lg font-semibold">Seller Performance (7d)</h3>
        <div className="mt-4 overflow-auto rounded-xl border border-white/10">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="bg-[#163C33] text-white/60">
              <tr>
                <th className="px-3 py-2">Seller</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">AI Used</th>
                <th className="px-3 py-2">Copy</th>
                <th className="px-3 py-2">Enhance</th>
                <th className="px-3 py-2">Poster</th>
                <th className="px-3 py-2">Orders 7d</th>
                <th className="px-3 py-2">Sales 7d</th>
                <th className="px-3 py-2">Sales Growth</th>
                <th className="px-3 py-2">AI Growth</th>
                <th className="px-3 py-2">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((row) => (
                <tr key={row.sellerId} className="border-t border-white/5">
                  <td className="px-3 py-2">{row.sellerName}</td>
                  <td className="px-3 py-2">{row.plan}</td>
                  <td className="px-3 py-2">{row.aiUsedTotal}</td>
                  <td className="px-3 py-2">{row.copyCount}</td>
                  <td className="px-3 py-2">{row.enhanceCount}</td>
                  <td className="px-3 py-2">{row.posterCount}</td>
                  <td className="px-3 py-2">{row.orders7d}</td>
                  <td className="px-3 py-2">{currencyFromCents(row.sales7dCents)}</td>
                  <td className="px-3 py-2">{row.salesGrowthPct.toFixed(1)}%</td>
                  <td className="px-3 py-2">{row.aiGrowthPct.toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${scoreTone(row.efficiencyScore)}`}>
                      {row.efficiencyScore.toFixed(0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AppCard>

      <AppCard className="p-5">
        <h3 className="text-lg font-semibold">Feature Effectiveness</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {featureEffects.map((row) => (
            <div key={row.feature} className="rounded-xl border border-white/10 bg-[#163C33] p-4">
              <p className="text-sm text-white/65">{row.feature}</p>
              <p className="mt-1 text-2xl font-bold">{row.avgSalesGrowthPct.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-white/60">{row.users} sellers in last 7d</p>
            </div>
          ))}
        </div>
      </AppCard>
    </div>
  );
}

