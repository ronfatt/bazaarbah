"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currencyFromCents } from "@/lib/utils";

type ProductLite = { id: string; name: string; price_cents: number };

export function CheckoutForm({ shopSlug, products }: { shopSlug: string; products: ProductLite[] }) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);

  const total = useMemo(() => {
    return products.reduce((acc, p) => acc + (qty[p.id] ?? 0) * p.price_cents, 0);
  }, [products, qty]);

  async function onCheckout() {
    const items = products
      .map((p) => ({ productId: p.id, qty: qty[p.id] ?? 0 }))
      .filter((p) => p.qty > 0);

    if (!items.length) {
      setStatus("Pick at least one product.");
      return;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopSlug, buyerName, buyerPhone, items }),
    });

    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "Order failed.");
      return;
    }

    window.location.href = `/o/${json.order.order_code}`;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Place Order</h2>
      {products.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 border-b border-neutral-100 py-2">
          <div>
            <p className="font-medium text-neutral-900">{p.name}</p>
            <p className="text-sm text-neutral-500">{currencyFromCents(p.price_cents)}</p>
          </div>
          <Input
            className="w-20"
            type="number"
            min={0}
            max={99}
            value={qty[p.id] ?? 0}
            onChange={(e) => setQty((s) => ({ ...s, [p.id]: Number(e.target.value) }))}
          />
        </div>
      ))}
      <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Your Name (optional)" />
      <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Phone / WhatsApp (optional)" />
      <p className="font-semibold">Total: {currencyFromCents(total)}</p>
      <Button onClick={onCheckout}>Submit Order</Button>
      {status && <p className="text-sm text-red-600">{status}</p>}
    </div>
  );
}
