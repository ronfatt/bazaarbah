import Link from "next/link";
import { ShoppingBag, Wallet, Clock3, BadgeCheck, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/auth";
import { currencyFromCents, startOfTodayIso } from "@/lib/utils";

export default async function DashboardPage() {
  const { user, profile } = await requireSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("id,slug,shop_name").eq("owner_id", user.id);
  const shopIds = shops?.map((s) => s.id) ?? [];

  if (!shopIds.length) {
    return (
      <section className="space-y-6">
        <Card className="border-dashed border-[#00C2A8]/30 bg-gradient-to-br from-[#112E27] to-[#163C33]">
          <p className="inline-flex items-center rounded-full bg-[#00C2A8]/10 px-3 py-1 text-xs font-medium text-[#00C2A8]">AI-ready Workspace</p>
          <h1 className="mt-4 text-3xl font-bold text-[#F3F4F6]">Welcome back, {profile.display_name ?? "Seller"}</h1>
          <p className="mt-2 max-w-xl text-sm text-[#9CA3AF]">Create your first shop to unlock products, orders, AI marketing bundle, and shareable buyer links.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/dashboard/shop" className="rounded-xl bg-[#C9A227] px-6 py-2 text-sm font-semibold text-black hover:bg-[#D4AF37]">
              Create Shop
            </Link>
            <Link href="/dashboard/ai" className="rounded-xl border border-white/10 bg-[#163C33] px-6 py-2 text-sm font-semibold text-white">
              Open AI Tools
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  const { data: orders } = await admin
    .from("orders")
    .select("id,order_code,status,buyer_name,subtotal_cents,created_at")
    .in("shop_id", shopIds)
    .order("created_at", { ascending: false });

  const todayIso = startOfTodayIso();
  const todayOrders = orders?.filter((o) => o.created_at >= todayIso).length ?? 0;
  const totalSales = orders?.filter((o) => o.status === "paid").reduce((acc, o) => acc + o.subtotal_cents, 0) ?? 0;
  const pending = orders?.filter((o) => o.status === "pending_payment" || o.status === "proof_submitted").length ?? 0;
  const paid = orders?.filter((o) => o.status === "paid").length ?? 0;

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

  const recentOrders = (orders ?? []).slice(0, 5);

  return (
    <section className="space-y-6">
      <Card className="bg-gradient-to-r from-[#112E27] to-[#163C33]">
        <p className="text-sm text-[#9CA3AF]">Welcome back</p>
        <h1 className="mt-1 text-3xl font-bold text-[#F3F4F6]">{profile.display_name ?? "Seller"}</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Quick stats, recent orders, and AI shortcuts for today.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Today Orders" value={String(todayOrders)} trend={12} icon={ShoppingBag} />
        <KpiCard title="Total Sales" value={currencyFromCents(totalSales)} trend={9} icon={Wallet} />
        <KpiCard title="Pending" value={String(pending)} trend={-4} icon={Clock3} />
        <KpiCard title="Paid" value={String(paid)} trend={11} icon={BadgeCheck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F3F4F6]">Weekly Sales</h2>
            <span className="inline-flex items-center rounded-full bg-[#C9A227]/15 px-3 py-1 text-xs font-medium text-[#C9A227]">7 days</span>
          </div>
          <SalesChart data={weekly} />
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-[#F3F4F6]">AI Shortcuts</h3>
          <div className="mt-3 space-y-2">
            <Link href="/dashboard/ai" className="flex items-center justify-between rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-sm text-[#F3F4F6] hover:border-[#00C2A8]/40">
              Product Background <ArrowUpRight size={14} className="text-[#00C2A8]" />
            </Link>
            <Link href="/dashboard/ai" className="flex items-center justify-between rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-sm text-[#F3F4F6] hover:border-[#00C2A8]/40">
              Poster Generator <ArrowUpRight size={14} className="text-[#00C2A8]" />
            </Link>
            <Link href="/dashboard/ai" className="flex items-center justify-between rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-sm text-[#F3F4F6] hover:border-[#00C2A8]/40">
              Copy Bundle <ArrowUpRight size={14} className="text-[#00C2A8]" />
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#F3F4F6]">Recent Orders</h3>
          <Link href="/dashboard/orders" className="text-sm font-medium text-[#C9A227]">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {recentOrders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[#163C33] px-3 py-2 hover:border-[#00C2A8]/35"
            >
              <div>
                <p className="font-mono text-xs text-[#9CA3AF]">{order.order_code}</p>
                <p className="text-sm text-[#F3F4F6]">{order.buyer_name ?? "Guest"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#F3F4F6]">{currencyFromCents(order.subtotal_cents)}</p>
                <p className="text-xs text-[#6B7280]">{order.status}</p>
              </div>
            </Link>
          ))}
          {recentOrders.length === 0 && <p className="rounded-xl border border-dashed border-white/10 bg-[#163C33] p-6 text-sm text-[#9CA3AF]">No orders yet.</p>}
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-[#F3F4F6]">Share Links</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {(shops ?? []).map((shop) => (
            <div key={shop.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#163C33] px-3 py-2">
              <span className="font-medium text-[#F3F4F6]">{shop.shop_name}</span>
              <Link className="font-mono text-xs text-[#C9A227]" href={`/s/${shop.slug}`}>
                /s/{shop.slug}
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
