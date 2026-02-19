import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { AppCard } from "@/components/ui/AppCard";
import { AdminSignoutButton } from "@/components/admin/admin-signout-button";
import { AIImpactDashboard } from "@/components/admin/ai-impact-dashboard";
import { requireAdminPortalUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LABEL } from "@/lib/plan";
import { getLangFromCookie } from "@/lib/i18n-server";

type ProfileRow = {
  id: string;
  display_name: string | null;
  role: "seller" | "admin";
  plan_tier: "free" | "pro_88" | "pro_128";
};

type ShopRow = { id: string; owner_id: string };
type OrderRow = { shop_id: string; status: string; subtotal_cents: number; created_at: string };
type AiJobRow = { owner_id: string; type: "copy" | "poster" | "product_image"; created_at: string };

function pctGrowth(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export default async function AdminAIImpactPage() {
  const lang = await getLangFromCookie();
  await requireAdminPortalUser();
  const admin = createAdminClient();

  const now = Date.parse(new Date().toUTCString());
  const sevenDaysAgoIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgoIso = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [profilesRes, shopsRes, ordersRes, aiJobsRes] = await Promise.all([
    admin.from("profiles").select("id,display_name,role,plan_tier"),
    admin.from("shops").select("id,owner_id"),
    admin.from("orders").select("shop_id,status,subtotal_cents,created_at").gte("created_at", fourteenDaysAgoIso),
    admin.from("ai_jobs").select("owner_id,type,created_at").gte("created_at", fourteenDaysAgoIso),
  ]);

  const sellers = ((profilesRes.data ?? []) as ProfileRow[]).filter((p) => p.role === "seller");
  const shops = (shopsRes.data ?? []) as ShopRow[];
  const orders = (ordersRes.data ?? []) as OrderRow[];
  const aiJobs = (aiJobsRes.data ?? []) as AiJobRow[];

  const shopOwner = new Map<string, string>(shops.map((s) => [s.id, s.owner_id]));
  const sellerStats = sellers.map((seller) => {
    const sellerOrders = orders.filter((o) => shopOwner.get(o.shop_id) === seller.id);
    const sellerAi = aiJobs.filter((j) => j.owner_id === seller.id);

    const curOrders = sellerOrders.filter((o) => o.created_at >= sevenDaysAgoIso && o.status !== "cancelled");
    const prevOrders = sellerOrders.filter((o) => o.created_at < sevenDaysAgoIso && o.status !== "cancelled");
    const curPaid = curOrders.filter((o) => o.status === "paid");
    const prevPaid = prevOrders.filter((o) => o.status === "paid");

    const curSales = curPaid.reduce((sum, o) => sum + Number(o.subtotal_cents ?? 0), 0);
    const prevSales = prevPaid.reduce((sum, o) => sum + Number(o.subtotal_cents ?? 0), 0);
    const curAi = sellerAi.filter((j) => j.created_at >= sevenDaysAgoIso);
    const prevAi = sellerAi.filter((j) => j.created_at < sevenDaysAgoIso);

    const copyCount = curAi.filter((j) => j.type === "copy").length;
    const enhanceCount = curAi.filter((j) => j.type === "product_image").length;
    const posterCount = curAi.filter((j) => j.type === "poster").length;
    const aiUsedTotal = curAi.length;
    const salesGrowthPct = pctGrowth(curSales, prevSales);
    const ordersGrowthPct = pctGrowth(curOrders.length, prevOrders.length);
    const aiGrowthPct = pctGrowth(curAi.length, prevAi.length);
    const efficiencyScore = Math.round(
      100 *
        (0.5 * clamp01((salesGrowthPct + 100) / 200) +
          0.3 * clamp01((ordersGrowthPct + 100) / 200) +
          0.2 * clamp01(aiUsedTotal / 20)),
    );

    return {
      sellerId: seller.id,
      sellerName: seller.display_name ?? seller.id.slice(0, 8),
      plan: PLAN_LABEL[(seller.plan_tier ?? "free") as "free" | "pro_88" | "pro_128"] ?? "Free",
      aiUsedTotal,
      copyCount,
      enhanceCount,
      posterCount,
      orders7d: curOrders.length,
      sales7dCents: curSales,
      salesGrowthPct,
      aiGrowthPct,
      efficiencyScore,
    };
  });

  const aiUsers = sellerStats.filter((s) => s.aiUsedTotal > 0);
  const nonAiUsers = sellerStats.filter((s) => s.aiUsedTotal === 0);

  const totalAIActions7d = aiUsers.reduce((sum, s) => sum + s.aiUsedTotal, 0);
  const aiActiveSellers7d = aiUsers.length;
  const avgAIperSeller = aiActiveSellers7d ? totalAIActions7d / aiActiveSellers7d : 0;
  const salesGrowthAIUsers = aiUsers.length ? aiUsers.reduce((sum, s) => sum + s.salesGrowthPct, 0) / aiUsers.length : 0;
  const globalEfficiencyScore = aiUsers.length ? aiUsers.reduce((sum, s) => sum + s.efficiencyScore, 0) / aiUsers.length : 0;

  const copyTotal = aiUsers.reduce((sum, s) => sum + s.copyCount, 0);
  const enhanceTotal = aiUsers.reduce((sum, s) => sum + s.enhanceCount, 0);
  const posterTotal = aiUsers.reduce((sum, s) => sum + s.posterCount, 0);
  const denom = Math.max(1, copyTotal + enhanceTotal + posterTotal);

  const usage = [
    { name: "Copy", value: (copyTotal / denom) * 100, color: "#00C2A8" },
    { name: "Enhance", value: (enhanceTotal / denom) * 100, color: "#C9A227" },
    { name: "Poster", value: (posterTotal / denom) * 100, color: "#4ADE80" },
  ];

  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  const comparison = [
    {
      cohort: "AI Users",
      avgAIUsed: avg(aiUsers.map((s) => s.aiUsedTotal)),
      avgSalesCents: Math.round(avg(aiUsers.map((s) => s.sales7dCents))),
      salesGrowthPct: avg(aiUsers.map((s) => s.salesGrowthPct)),
    },
    {
      cohort: "Non-AI Users",
      avgAIUsed: avg(nonAiUsers.map((s) => s.aiUsedTotal)),
      avgSalesCents: Math.round(avg(nonAiUsers.map((s) => s.sales7dCents))),
      salesGrowthPct: avg(nonAiUsers.map((s) => s.salesGrowthPct)),
    },
  ];

  const featureEffects = [
    {
      feature: "Poster",
      users: sellerStats.filter((s) => s.posterCount > 0).length,
      avgSalesGrowthPct: avg(sellerStats.filter((s) => s.posterCount > 0).map((s) => s.salesGrowthPct)),
    },
    {
      feature: "Enhance",
      users: sellerStats.filter((s) => s.enhanceCount > 0).length,
      avgSalesGrowthPct: avg(sellerStats.filter((s) => s.enhanceCount > 0).map((s) => s.salesGrowthPct)),
    },
    {
      feature: "Copy",
      users: sellerStats.filter((s) => s.copyCount > 0).length,
      avgSalesGrowthPct: avg(sellerStats.filter((s) => s.copyCount > 0).map((s) => s.salesGrowthPct)),
    },
  ];

  return (
    <main className="min-h-screen bg-bb-bg px-6 py-6 text-bb-text">
      <div className="mx-auto w-full max-w-[1380px] space-y-6">
        <AppCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">AI Impact</h1>
              <p className="mt-2 text-sm text-white/65">Seller AI adoption, usage, and sales impact (last 7 days).</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/plan-requests" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Plan Reviews
              </Link>
              <Link href="/admin/members" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Members
              </Link>
              <Link href="/admin/announcements" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Announcements
              </Link>
              <Link href="/admin/pricing" className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/80 hover:bg-[#1b4a40]">
                Pricing
              </Link>
              <Badge variant="ai">AI Impact</Badge>
              <AdminSignoutButton lang={lang} />
            </div>
          </div>
        </AppCard>

        <AIImpactDashboard
          kpi={{
            aiActiveSellers7d,
            totalAIActions7d,
            avgAIperSeller,
            salesGrowthAIUsers,
            globalEfficiencyScore,
          }}
          usage={usage}
          comparison={comparison}
          sellers={sellerStats.sort((a, b) => b.efficiencyScore - a.efficiencyScore)}
          featureEffects={featureEffects}
        />
      </div>
    </main>
  );
}
