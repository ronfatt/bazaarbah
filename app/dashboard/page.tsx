import Link from "next/link";
import { ShoppingBag, Wallet, Clock3, BadgeCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/auth";
import { currencyFromCents, startOfTodayIso } from "@/lib/utils";

export default async function DashboardPage() {
  const { user } = await requireSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("id,slug,shop_name").eq("owner_id", user.id);
  const shopIds = shops?.map((s) => s.id) ?? [];

  if (!shopIds.length) {
    return (
      <section className="space-y-6">
        <Card className="relative overflow-hidden border-dashed bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white">
          <div className="pointer-events-none absolute -left-12 -top-16 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative p-1">
            <p className="font-mono text-xs uppercase text-white/70">Empty State</p>
            <h1 className="mt-2 text-3xl font-bold">Launch Your First Raya Shop</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">Create your shop profile to unlock products, orders, buyer links, and the AI marketing bundle.</p>
            <div className="mt-5 flex gap-3">
              <Link href="/dashboard/shop" className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-900">
                Create Shop Now
              </Link>
              <Link href="/dashboard/ai" className="rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold">
                Explore AI Features
              </Link>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  const { data: orders } = await admin
    .from("orders")
    .select("id,status,subtotal_cents,created_at")
    .in("shop_id", shopIds);

  const todayIso = startOfTodayIso();
  const todayOrders = orders?.filter((o) => o.created_at >= todayIso).length ?? 0;
  const totalSales = orders?.filter((o) => o.status === "paid").reduce((acc, o) => acc + o.subtotal_cents, 0) ?? 0;
  const pending = orders?.filter((o) => o.status === "pending_payment" || o.status === "proof_submitted").length ?? 0;
  const paid = orders?.filter((o) => o.status === "paid").length ?? 0;

  const startYesterday = new Date();
  startYesterday.setDate(startYesterday.getDate() - 1);
  startYesterday.setHours(0, 0, 0, 0);
  const endYesterday = new Date(startYesterday);
  endYesterday.setDate(endYesterday.getDate() + 1);

  const yesterdayOrders = orders?.filter((o) => o.created_at >= startYesterday.toISOString() && o.created_at < endYesterday.toISOString()).length ?? 1;
  const yesterdayPaid = orders?.filter((o) => o.status === "paid" && o.created_at >= startYesterday.toISOString() && o.created_at < endYesterday.toISOString()).length ?? 1;

  const trendOrders = Math.round(((todayOrders - yesterdayOrders) / Math.max(yesterdayOrders, 1)) * 100);
  const trendPaid = Math.round(((paid - yesterdayPaid) / Math.max(yesterdayPaid, 1)) * 100);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const weekly = days.map((day) => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const sales =
      orders
        ?.filter((o) => o.status === "paid" && o.created_at >= day.toISOString() && o.created_at < next.toISOString())
        .reduce((acc, o) => acc + o.subtotal_cents, 0) ?? 0;

    return { day: `${day.getMonth() + 1}/${day.getDate()}`, sales };
  });

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Today Orders" value={String(todayOrders)} trend={trendOrders} icon={ShoppingBag} />
        <KpiCard title="Total Sales" value={currencyFromCents(totalSales)} trend={trendPaid} icon={Wallet} />
        <KpiCard title="Pending" value={String(pending)} trend={-8} icon={Clock3} />
        <KpiCard title="Paid" value={String(paid)} trend={trendPaid} icon={BadgeCheck} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Weekly Sales</h2>
            <p className="text-sm text-neutral-500">Paid order totals over the past 7 days</p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Sparkles size={12} /> Live KPI
          </div>
        </div>
        <SalesChart data={weekly} />
      </Card>

      <Card>
        <h3 className="text-base font-semibold">Share Link</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {(shops ?? []).map((shop) => (
            <div key={shop.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2">
              <span className="font-medium">{shop.shop_name}</span>
              <Link className="font-mono text-xs text-amber-700" href={`/s/${shop.slug}`}>
                /s/{shop.slug}
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
