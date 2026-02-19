"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { currencyFromCents } from "@/lib/utils";
import { t, type Lang } from "@/lib/i18n";
import { resolveEffectivePrice, type PlanPriceRow } from "@/lib/plan";

type Price = {
  plan_tier: "pro_88" | "pro_128";
  list_price_cents: number;
  ai_total_credits: number;
  promo_price_cents: number | null;
  promo_active: boolean;
  promo_start_at: string | null;
  promo_end_at: string | null;
};

type Costs = {
  copy: number;
  image: number;
  poster: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoToLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function localInputToIso(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function centsToRmInput(cents: number | null) {
  if (!cents) return "";
  return (cents / 100).toFixed(2);
}

function rmInputToCents(value: string) {
  const num = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export function PricingManager({
  initialPrices,
  initialCosts,
  lang = "en",
  hideAiCosts = false,
}: {
  initialPrices: Price[];
  initialCosts: Costs;
  lang?: Lang;
  hideAiCosts?: boolean;
}) {
  const [prices, setPrices] = useState<Price[]>(initialPrices);
  const [costs, setCosts] = useState<Costs>(initialCosts);
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
        action: "update_plan",
        planTier: plan.plan_tier,
        listPriceCents: plan.list_price_cents,
        promoPriceCents: plan.promo_price_cents,
        promoActive: plan.promo_active,
        promoStartAt: plan.promo_start_at,
        promoEndAt: plan.promo_end_at,
        aiTotalCredits: plan.ai_total_credits,
      }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setStatus(json.error ?? "Failed");
      return;
    }
    setStatus("OK");
    window.location.reload();
  }

  async function saveCosts() {
    setBusy("costs");
    setStatus(null);
    const res = await fetch("/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_costs",
        copyCost: costs.copy,
        imageCost: costs.image,
        posterCost: costs.poster,
      }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setStatus(json.error ?? "Failed");
      return;
    }
    setStatus("OK");
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {prices.map((plan) => (
        <div key={plan.plan_tier} className="rounded-2xl border border-white/10 bg-[#163C33] p-5">
          {(() => {
            const current = resolveEffectivePrice(plan as PlanPriceRow) ?? plan.list_price_cents;
            return (
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">{plan.plan_tier === "pro_88" ? "RM88 Plan" : "RM168 Plan"}</h3>
            <p className="text-sm text-white/70">
              Current shown: {currencyFromCents(current)}
            </p>
          </div>
            );
          })()}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-white/70">
              List price (RM)
              <input
                type="text"
                inputMode="decimal"
                value={centsToRmInput(plan.list_price_cents)}
                onChange={(e) => patch(plan.plan_tier, { list_price_cents: rmInputToCents(e.target.value) })}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Promo price (RM)
              <input
                type="text"
                inputMode="decimal"
                value={centsToRmInput(plan.promo_price_cents)}
                onChange={(e) => {
                  const cents = rmInputToCents(e.target.value);
                  patch(plan.plan_tier, { promo_price_cents: cents > 0 ? cents : null });
                }}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              AI total credits
              <input
                type="number"
                value={plan.ai_total_credits}
                onChange={(e) => patch(plan.plan_tier, { ai_total_credits: Number(e.target.value || 0) })}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Promo start (optional)
              <input
                type="datetime-local"
                value={isoToLocalInput(plan.promo_start_at)}
                onChange={(e) => patch(plan.plan_tier, { promo_start_at: localInputToIso(e.target.value) })}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Promo end (optional)
              <input
                type="datetime-local"
                value={isoToLocalInput(plan.promo_end_at)}
                onChange={(e) => patch(plan.plan_tier, { promo_end_at: localInputToIso(e.target.value) })}
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
              {busy === plan.plan_tier ? "..." : t(lang, "admin.pricing")}
            </AppButton>
          </div>
        </div>
      ))}

      {!hideAiCosts ? (
        <div className="rounded-2xl border border-white/10 bg-[#163C33] p-5">
          <h3 className="text-lg font-semibold text-white">AI Credit Cost per Action</h3>
          <p className="mt-1 text-sm text-white/65">Set how many credits each generation uses.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm text-white/70">
              Copy cost
              <input
                type="number"
                min={1}
                value={costs.copy}
                onChange={(e) => setCosts((prev) => ({ ...prev, copy: Number(e.target.value || 1) }))}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Image cost
              <input
                type="number"
                min={1}
                value={costs.image}
                onChange={(e) => setCosts((prev) => ({ ...prev, image: Number(e.target.value || 1) }))}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
            <label className="text-sm text-white/70">
              Poster cost
              <input
                type="number"
                min={1}
                value={costs.poster}
                onChange={(e) => setCosts((prev) => ({ ...prev, poster: Number(e.target.value || 1) }))}
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
              />
            </label>
          </div>
          <div className="mt-4">
            <AppButton onClick={saveCosts} disabled={busy === "costs"}>
              {busy === "costs" ? "..." : "Save AI Costs"}
            </AppButton>
          </div>
        </div>
      ) : null}
      {status ? <p className="text-sm text-white/80">{status}</p> : null}
    </div>
  );
}
