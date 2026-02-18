import Link from "next/link";
import { ShoppingBag, Wallet, Clock3, BadgeCheck, Sparkles } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { AppTable, AppTableWrap } from "@/components/ui/AppTable";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/auth";
import { currencyFromCents, startOfTodayIso } from "@/lib/utils";

function statusVariant(status: string): "pending" | "paid" | "cancelled" | "neutral" {
  if (status === "paid") return "paid";
  if (status === "cancelled") return "cancelled";
  if (status === "pending_payment" || status === "proof_submitted") return "pending";
  return "neutral";
}

export default async function DashboardPage() {
  const { user, profile } = await requireSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("id,slug,shop_name").eq("owner_id", user.id);
  const shopIds = shops?.map((s) => s.id) ?? [];

  const { data: orders } = shopIds.length
    ? await admin
        .from("orders")
        .select("id,order_code,status,buyer_name,subtotal_cents,created_at")
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false })
    : { data: [] as Array<{ id: string; order_code: string; status: string; buyer_name: string | null; subtotal_cents: number; created_at: string }> };

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

  const recentOrders = (orders ?? []).slice(0, 6);
  const hasShop = shopIds.length > 0;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Today Orders" value={String(todayOrders)} trend={12} icon={ShoppingBag} />
        <KpiCard title="Total Sales" value={currencyFromCents(totalSales)} trend={9} icon={Wallet} />
        <KpiCard title="Pending" value={String(pending)} trend={-4} icon={Clock3} />
        <KpiCard title="Paid" value={String(paid)} trend={11} icon={BadgeCheck} />
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-8">
        <AppCard className="p-6 hover:-translate-y-0.5 hover:border-bb-ai/20 transition">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-bb-muted">Workspace</p>
              <h1 className="mt-1 text-2xl font-bold">Welcome back, {profile.display_name ?? "Seller"}</h1>
              <p className="mt-2 text-sm text-bb-muted">Setup checklist + quick actions to launch faster.</p>
            </div>
            <Badge variant="ai">AI-ready</Badge>
          </div>

          {!hasShop && (
            <div className="mt-5 rounded-xl border border-bb-ai/15 bg-bb-surface2/40 p-4">
              <p className="text-sm font-semibold">Setup Checklist</p>
              <ul className="mt-2 space-y-1 text-sm text-bb-muted">
                <li>1. Create your shop profile</li>
                <li>2. Add first product</li>
                <li>3. Share `/s/your-slug` link</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <Link href="/dashboard/shop">
                  <AppButton variant="primary">Create Shop</AppButton>
                </Link>
                <Link href="/dashboard/products">
                  <AppButton variant="secondary">Add Product</AppButton>
                </Link>
              </div>
            </div>
          )}

          {hasShop && (
            <div className="mt-5">
              <p className="text-sm font-semibold">Weekly Sales</p>
              <div className="mt-3">
                <SalesChart data={weekly} />
              </div>
            </div>
          )}
        </AppCard>

        <AppCard className="p-6 hover:-translate-y-0.5 hover:border-bb-ai/20 transition">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-sm text-bb-gold hover:underline">
              View all
            </Link>
          </div>

          <AppTableWrap>
            <AppTable>
              <thead className="bg-bb-surface2/70 text-bb-muted">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-bb-border/5 hover:bg-bb-surface2/50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/dashboard/orders/${o.id}`} className="text-bb-gold">
                        {o.order_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.buyer_name ?? "Guest"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">{currencyFromCents(o.subtotal_cents)}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-bb-muted">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </AppTable>
          </AppTableWrap>
        </AppCard>
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-4">
        <AppCard className="p-6 hover:-translate-y-0.5 hover:border-bb-ai/20 transition">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-bb-ai" />
            <h3 className="text-lg font-semibold">AI Shortcuts</h3>
          </div>
          <p className="mt-2 text-sm text-bb-muted">Generate assets faster with one-click flows.</p>
          <div className="mt-4 space-y-2">
            <Link href="/dashboard/ai" className="block">
              <AppButton variant="ai" className="w-full justify-start">Product Background</AppButton>
            </Link>
            <Link href="/dashboard/ai" className="block">
              <AppButton variant="ai" className="w-full justify-start">Poster Generator</AppButton>
            </Link>
            <Link href="/dashboard/ai" className="block">
              <AppButton variant="ai" className="w-full justify-start">Copy Bundle</AppButton>
            </Link>
          </div>
        </AppCard>

        <AppCard className="p-6 hover:-translate-y-0.5 hover:border-bb-ai/20 transition">
          <h3 className="text-lg font-semibold">Credits Meter</h3>
          <p className="mt-2 text-sm text-bb-muted">Use credits intentionally for seasonal campaigns.</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-bb-surface2/60 p-3">
              <span>Copy</span>
              <span className="font-semibold">{profile.copy_credits}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-bb-surface2/60 p-3">
              <span>Image</span>
              <span className="font-semibold">{profile.image_credits}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-bb-surface2/60 p-3">
              <span>Poster</span>
              <span className="font-semibold">{profile.poster_credits}</span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
