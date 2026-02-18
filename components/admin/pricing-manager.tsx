"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { currencyFromCents } from "@/lib/utils";

type Price = {
  plan_tier: "pro_88" | "pro_128";
  list_price_cents: number;
  promo_price_cents: number | null;
  promo_active: boolean;
  promo_start_at: string | null;
  promo_end_at: string | null;
};

export function PricingManager({ initialPrices }: { initialPrices: Price[] }) {
  const [prices, setPrices] = useState<Price[]>(initialPrices);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function patch(plan: Price["plan_tier"], changes: Partial<Price>) {
    setPrices((prev) => prev.map((p) => (p.plan_tier === plan ? { ...p, ...changes } : p)));
  }

  async function save(plan: Price) {
    setBusy(plan.plan_tier);
    setStatus(null);
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planTier: plan.plan_tier,
        listPriceCents: plan.list_price_cents,
        promoPriceCents: plan.promo_price_cents,
        promoActive: plan.promo_active,
        promoStartAt: plan.promo_start_at,
        promoEndAt: plan.promo_end_at,
      }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setStatus(json.error ?? "Failed to save pricing.");
      return;
    }
    setStatus(`${plan.plan_tier} pricing updated.`);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {prices.map((plan) => (
        <div key={plan.plan_tier} className="rounded-2xl border border-white/10 bg-[#163C33] p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">{plan.plan_tier === "pro_88" ? "RM88 Plan" : "RM128 Plan"}</h3>
            <p className="text-sm text-white/70">
              Current shown: {currencyFromCents(plan.promo_active && plan.promo_price_cents ? plan.promo_price_cents : plan.list_price_cents)}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-white/70">
              List price (cents)
              <input
                type="number"
                value={plan.list_price_cents}
                onChange={(e) => patch(plan.plan_tier, { list_price_cents: Number(e.target.value || 0) })}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Promo price (cents)
              <input
                type="number"
                value={plan.promo_price_cents ?? ""}
                onChange={(e) => patch(plan.plan_tier, { promo_price_cents: e.target.value ? Number(e.target.value) : null })}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Promo start (optional)
              <input
                type="datetime-local"
                value={plan.promo_start_at ? new Date(plan.promo_start_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => patch(plan.plan_tier, { promo_start_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Promo end (optional)
              <input
                type="datetime-local"
                value={plan.promo_end_at ? new Date(plan.promo_end_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => patch(plan.plan_tier, { promo_end_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={plan.promo_active} onChange={(e) => patch(plan.plan_tier, { promo_active: e.target.checked })} />
            Promo active
          </label>

          <div className="mt-4">
            <AppButton onClick={() => save(plan)} disabled={busy === plan.plan_tier}>
              {busy === plan.plan_tier ? "Saving..." : "Save Pricing"}
            </AppButton>
          </div>
        </div>
      ))}
      {status ? <p className="text-sm text-white/80">{status}</p> : null}
    </div>
  );
}

