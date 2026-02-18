import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSeller } from "@/lib/auth";
import { currencyFromCents, startOfTodayIso } from "@/lib/utils";

export default async function DashboardPage() {
  const { user } = await requireSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const shopIds = shops?.map((s) => s.id) ?? [];

  const { data: orders } = shopIds.length
    ? await admin.from("orders").select("id,status,subtotal_cents,created_at").in("shop_id", shopIds)
    : { data: [] as Array<{ id: string; status: string; subtotal_cents: number; created_at: string }> };

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
    const value =
      orders
        ?.filter((o) => o.status === "paid" && o.created_at >= day.toISOString() && o.created_at < next.toISOString())
        .reduce((acc, o) => acc + o.subtotal_cents, 0) ?? 0;

    return { label: `${day.getMonth() + 1}/${day.getDate()}`, value };
  });

  const max = Math.max(...weekly.map((w) => w.value), 1);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-neutral-500">Today Orders</p><p className="mt-2 text-2xl font-bold">{todayOrders}</p></Card>
        <Card><p className="text-sm text-neutral-500">Total Sales</p><p className="mt-2 text-2xl font-bold">{currencyFromCents(totalSales)}</p></Card>
        <Card><p className="text-sm text-neutral-500">Pending</p><p className="mt-2 text-2xl font-bold">{pending}</p></Card>
        <Card><p className="text-sm text-neutral-500">Paid</p><p className="mt-2 text-2xl font-bold">{paid}</p></Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Weekly Sales</h2>
        <div className="mt-4 grid grid-cols-7 items-end gap-3">
          {weekly.map((w) => (
            <div key={w.label} className="text-center">
              <div className="mx-auto h-40 w-full max-w-12 rounded-t-lg bg-amber-100 p-1">
                <div className="w-full rounded-t-md bg-amber-500" style={{ height: `${Math.max((w.value / max) * 100, 4)}%`, marginTop: "auto" }} />
              </div>
              <p className="mt-2 text-xs text-neutral-500">{w.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
