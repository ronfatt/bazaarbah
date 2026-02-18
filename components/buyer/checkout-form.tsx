"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currencyFromCents } from "@/lib/utils";
import { t, type Lang } from "@/lib/i18n";

type ProductLite = {
  id: string;
  name: string;
  price_cents: number;
  description?: string | null;
  image_url?: string | null;
};

export function CheckoutForm({ shopSlug, products, lang = "en" }: { shopSlug: string; products: ProductLite[]; lang?: Lang }) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);

  const cartRows = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product || quantity <= 0) return null;
        return {
          id: product.id,
          name: product.name,
          qty: quantity,
          lineTotal: product.price_cents * quantity,
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; qty: number; lineTotal: number }>;
  }, [cart, products]);

  const total = useMemo(() => cartRows.reduce((acc, row) => acc + row.lineTotal, 0), [cartRows]);

  async function onCheckout() {
    const items = cartRows.map((row) => ({ productId: row.id, qty: row.qty }));

    if (!items.length) {
      setStatus(t(lang, "buyer.pick_one"));
      return;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopSlug,
        buyerName: buyerName.trim() || undefined,
        buyerPhone: buyerPhone.trim() || undefined,
        items,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? t(lang, "buyer.order_failed"));
      return;
    }

    window.location.href = `/o/${json.order.order_code}`;
  }

  function draftQty(id: string) {
    return qtyDraft[id] ?? 1;
  }

  function setDraftQty(id: string, next: number) {
    const safe = Math.max(1, Math.min(99, next));
    setQtyDraft((prev) => ({ ...prev, [id]: safe }));
  }

  function addToOrder(id: string) {
    const nextQty = draftQty(id);
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + nextQty }));
    setStatus(null);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">{t(lang, "buyer.products")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <div className="aspect-[4/3] bg-neutral-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-sm text-neutral-400">No image</div>
                )}
              </div>
              <div className="space-y-3 p-3">
                <div>
                  <p className="font-semibold text-neutral-900">{p.name}</p>
                  <p className="text-sm font-medium text-neutral-700">{currencyFromCents(p.price_cents)}</p>
                  {p.description ? <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{p.description}</p> : null}
                </div>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50">
                    <button type="button" onClick={() => setDraftQty(p.id, draftQty(p.id) - 1)} className="px-3 py-1 text-neutral-700">
                      -
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold text-neutral-900">{draftQty(p.id)}</span>
                    <button type="button" onClick={() => setDraftQty(p.id, draftQty(p.id) + 1)} className="px-3 py-1 text-neutral-700">
                      +
                    </button>
                  </div>
                  <Button type="button" onClick={() => addToOrder(p.id)}>
                    Add to Order
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {products.length === 0 && <p className="text-sm text-neutral-500">{t(lang, "buyer.menu_soon")}</p>}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-5">
        <h2 className="text-lg font-semibold text-neutral-900">Your Order</h2>
        <div className="mt-3 space-y-2">
          {cartRows.length === 0 ? (
            <p className="text-sm text-neutral-500">Your order is empty.</p>
          ) : (
            cartRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-sm">
                <p className="text-neutral-800">
                  {row.name} x {row.qty}
                </p>
                <p className="font-medium text-neutral-900">{currencyFromCents(row.lineTotal)}</p>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-3">
          <p className="text-base font-semibold text-neutral-900">
            {t(lang, "buyer.total")} {currencyFromCents(total)}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder={t(lang, "buyer.name_optional")} />
          <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder={t(lang, "buyer.phone_optional")} />
        </div>

        <div className="mt-4">
          <Button onClick={onCheckout} disabled={cartRows.length === 0} className="w-full">
            Confirm Order
          </Button>
          {status && <p className="mt-2 text-sm text-red-600">{status}</p>}
        </div>
      </aside>
    </div>
  );
}
