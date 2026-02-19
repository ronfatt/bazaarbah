"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import { currencyFromCents } from "@/lib/utils";
import { PLAN_AI_CREDITS, PLAN_AI_TOTAL_CREDITS, PLAN_LABEL, PLAN_PRICE_CENTS, resolveEffectivePrice, type PlanPriceRow, type PlanTier } from "@/lib/plan";
import { t, type Lang } from "@/lib/i18n";

type PlanRequest = {
  id: string;
  target_plan: "pro_88" | "pro_128";
  amount_cents: number;
  status: "pending_review" | "approved" | "rejected";
  proof_image_url: string | null;
  reference_text: string | null;
  note: string | null;
  submitted_at: string;
};

function statusBadge(status: PlanRequest["status"]) {
  if (status === "approved") return <Badge variant="paid">approved</Badge>;
  if (status === "rejected") return <Badge variant="cancelled">rejected</Badge>;
  return <Badge variant="pending">pending review</Badge>;
}

const PLAN_BENEFITS: Record<PlanTier, string[]> = {
  free: ["Dashboard view only", "No shop/product/order actions", "Upgrade required for AI tools"],
  pro_88: ["All selling modules unlocked", "Manual payment + receipt workflow", "Starter AI quota for seasonal campaign"],
  pro_128: ["All selling modules unlocked", "Higher AI quota for frequent posting", "Priority for heavy marketing usage"],
};

export function PlanUpgradePanel({
  currentTier,
  aiCredits,
  prices,
  requests,
  lang = "en",
}: {
  currentTier: PlanTier;
  aiCredits: number;
  prices: Partial<Record<"pro_88" | "pro_128", PlanPriceRow>>;
  requests: PlanRequest[];
  lang?: Lang;
}) {
  const [targetPlan, setTargetPlan] = useState<"pro_88" | "pro_128">(currentTier === "pro_88" ? "pro_128" : "pro_88");
  const [referenceText, setReferenceText] = useState("");
  const [slipUrl, setSlipUrl] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const pendingExists = requests.some((r) => r.status === "pending_review");
  const plans: PlanTier[] = ["free", "pro_88", "pro_128"];
  const currentAmount =
    targetPlan === "pro_88" || targetPlan === "pro_128"
      ? resolveEffectivePrice(prices[targetPlan] ?? null) ?? PLAN_PRICE_CENTS[targetPlan]
      : PLAN_PRICE_CENTS[targetPlan];

  async function submitUpgrade() {
    setLoading(true);
    setResult(null);

    const form = new FormData();
    form.append("targetPlan", targetPlan);
    form.append("referenceText", referenceText);
    form.append("slipUrl", slipUrl);
    if (slipFile) {
      form.append("slipFile", slipFile);
    }

    const res = await fetch("/api/plan-requests", { method: "POST", body: form });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setResult(json.error ?? "Failed to submit request");
      return;
    }

    setResult(t(lang, "dashboard.upgrade_now"));
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const credits = PLAN_AI_CREDITS[plan];
          const isCurrent = currentTier === plan;
          const priceRow = plan === "free" ? null : (prices[plan] ?? null);
          const listPrice = priceRow?.list_price_cents ?? PLAN_PRICE_CENTS[plan];
          const effectivePrice = resolveEffectivePrice(priceRow) ?? PLAN_PRICE_CENTS[plan];
          const promoActuallyApplied = plan !== "free" && effectivePrice < listPrice;
          return (
            <div
              key={plan}
              className={`rounded-2xl border p-4 ${
                isCurrent ? "border-[#C9A227]/50 bg-[#C9A227]/10" : "border-white/10 bg-[#163C33]"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-white">{PLAN_LABEL[plan]}</p>
                {isCurrent ? <Badge variant="paid">{t(lang, "plan.active")}</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-white/70">
                {plan === "free" ? "RM0" : currencyFromCents(effectivePrice)}
                {promoActuallyApplied ? (
                  <span className="ml-2 text-xs text-white/45 line-through">{currencyFromCents(listPrice)}</span>
                ) : null}
              </p>
              <p className="mt-3 text-xs text-white/60">
                AI total {PLAN_AI_TOTAL_CREDITS[plan]}
              </p>
              <p className="mt-1 text-xs text-white/60">
                AI credits: Copy {credits.copy} • Image {credits.image} • Poster {credits.poster}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-white/75">
                {PLAN_BENEFITS[plan].map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <div className="rounded-xl border border-white/10 bg-[#163C33] p-4 text-sm">
          <p className="text-white/65">Current AI credits</p>
          <p className="mt-1 text-lg font-semibold text-white">{aiCredits}</p>
        </div>
      </div>

      {currentTier !== "pro_128" && (
        <div className="rounded-2xl border border-[#C9A227]/25 bg-[#C9A227]/10 p-5">
          <h3 className="text-lg font-semibold text-white">Upgrade Plan (Manual Bank Transfer)</h3>
          <p className="mt-1 text-sm text-white/65">Transfer first, then upload your bank slip below. Admin will approve manually.</p>
          <p className="mt-3 text-sm text-white/80">Bank: Maybank | Account: BazaarBah Sdn Bhd | A/C: 5140 8899 2211</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="rounded-xl border border-white/10 bg-[#0B241F] p-3 text-sm text-white/80">
              Target plan
              <select
                value={targetPlan}
                onChange={(e) => setTargetPlan(e.target.value as "pro_88" | "pro_128")}
                className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                disabled={pendingExists}
              >
                {currentTier === "free" && <option value="pro_88">RM88</option>}
                <option value="pro_128">RM128</option>
              </select>
            </label>

            <label className="rounded-xl border border-white/10 bg-[#0B241F] p-3 text-sm text-white/80">
              Amount
              <p className="mt-2 text-lg font-semibold text-white">{currencyFromCents(currentAmount)}</p>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="Bank reference text"
              className="h-11 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
              disabled={pendingExists}
            />
            <input
              value={slipUrl}
              onChange={(e) => setSlipUrl(e.target.value)}
              placeholder="Slip image URL (optional if uploading file)"
              className="h-11 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
              disabled={pendingExists}
            />
          </div>

          <label className="mt-3 block rounded-xl border border-dashed border-white/20 bg-[#0B241F] p-3 text-sm text-white/65">
            Upload bank slip (jpg/png/webp, max 5MB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-white/65"
              disabled={pendingExists}
            />
          </label>

          <div className="mt-4 flex items-center gap-3">
            <AppButton onClick={submitUpgrade} disabled={loading || pendingExists}>
              {loading ? "Submitting..." : pendingExists ? "Pending Review" : "Submit Upgrade Request"}
            </AppButton>
            <p className="text-sm text-white/65">
              Target: {PLAN_LABEL[targetPlan]} ({PLAN_AI_CREDITS[targetPlan].copy}/{PLAN_AI_CREDITS[targetPlan].image}/{PLAN_AI_CREDITS[targetPlan].poster})
            </p>
          </div>
          {result && <p className="mt-3 text-sm text-white/80">{result}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#112E27] p-5">
        <h3 className="text-lg font-semibold text-white">Upgrade Requests</h3>
        <div className="mt-3 space-y-3 text-sm">
          {requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-white">
                  {PLAN_LABEL[req.target_plan]} • {currencyFromCents(req.amount_cents)}
                </p>
                {statusBadge(req.status)}
              </div>
              <p className="mt-1 text-white/65">Submitted: {new Date(req.submitted_at).toLocaleString("en-MY")}</p>
              {req.reference_text && <p className="mt-1 text-white/65">Reference: {req.reference_text}</p>}
              {req.proof_image_url && (
                <a href={req.proof_image_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-bb-gold hover:underline">
                  Open slip image
                </a>
              )}
              {req.note && <p className="mt-1 text-rose-300">Note: {req.note}</p>}
            </div>
          ))}
          {requests.length === 0 && <p className="text-white/45">No requests yet.</p>}
        </div>
      </div>
    </div>
  );
}
