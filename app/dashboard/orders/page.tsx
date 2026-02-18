import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents } from "@/lib/utils";

const statuses = ["all", "pending_payment", "proof_submitted", "paid", "cancelled"] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const selected = statuses.includes((status as (typeof statuses)[number]) ?? "all") ? (status as string) : "all";

  const { user } = await requireSeller();
  const admin = createAdminClient();
  const { data: shops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const shopIds = shops?.map((s) => s.id) ?? [];

  const query = admin
    .from("orders")
    .select("id,order_code,buyer_name,buyer_phone,status,subtotal_cents,created_at")
    .in("shop_id", shopIds)
    .order("created_at", { ascending: false });

  if (selected !== "all") {
    query.eq("status", selected);
  }

  const { data: orders } = await query;

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${s}`}
              className={`rounded-lg px-3 py-1 text-sm ${selected === s ? "bg-amber-500 text-neutral-950" : "bg-neutral-100 text-neutral-700"}`}
            >
              {s}
            </Link>
          ))}
        </div>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3">Order Code</th>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/dashboard/orders/${o.id}`} className="text-amber-700">
                    {o.order_code}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.buyer_name ?? "Guest"}</td>
                <td className="px-4 py-3">{o.status}</td>
                <td className="px-4 py-3">{currencyFromCents(o.subtotal_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
