import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { currencyFromCents } from "@/lib/utils";
import { PaymentProofForm } from "@/components/buyer/payment-proof-form";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

type PublicOrder = {
  id: string;
  order_code: string;
  status: string;
  subtotal_cents: number;
  created_at: string;
  shop_name: string;
  payment_qr_url: string | null;
};

type PublicOrderItem = {
  id: string;
  qty: number;
  line_total_cents: number;
  product_name: string;
};

export default async function OrderCodePage({ params }: { params: Promise<{ order_code: string }> }) {
  const lang = await getLangFromCookie();
  const { order_code } = await params;
  const supabase = await createClient();

  const [orderRes, itemsRes] = await Promise.all([
    supabase.rpc("get_order_public", { p_order_code: order_code }),
    supabase.rpc("get_order_items_public", { p_order_code: order_code }),
  ]);

  const order = (orderRes.data?.[0] ?? null) as PublicOrder | null;
  const items = (itemsRes.data ?? []) as PublicOrderItem[];

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 md:px-10">
      <Card>
        <h1 className="text-2xl font-bold">{t(lang, "buyer.order_page")} {order.order_code}</h1>
        <p className="mt-1 text-sm text-neutral-600">{t(lang, "buyer.shop")} {order.shop_name}</p>
        <p className="mt-1 text-sm text-neutral-600">{t(lang, "dashboard.status")} {order.status}</p>
        <p className="mt-1 text-sm font-semibold">{t(lang, "buyer.amount")} {currencyFromCents(order.subtotal_cents)}</p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-800">{t(lang, "buyer.manual_qr")}</p>
          <p className="text-amber-700">{t(lang, "buyer.manual_qr_desc")}</p>
          {order.payment_qr_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={order.payment_qr_url} alt="Seller payment QR" className="mt-3 h-56 w-56 rounded-lg border border-amber-200 bg-white object-contain p-2" />
          ) : (
            <p className="mt-2 text-xs text-amber-700">Seller has not uploaded payment QR yet. Please contact seller.</p>
          )}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">{t(lang, "buyer.items")}</h2>
          <div className="mt-3 space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between border-b border-neutral-100 py-2">
                <span>
                  {item.product_name} x {item.qty}
                </span>
                <span>{currencyFromCents(item.line_total_cents)}</span>
              </div>
            ))}
          </div>
          {items.length === 0 && <p className="mt-2 text-sm text-neutral-500">{t(lang, "buyer.no_items")}</p>}
        </Card>

        <PaymentProofForm orderCode={order.order_code} lang={lang} />
      </div>
    </main>
  );
}
