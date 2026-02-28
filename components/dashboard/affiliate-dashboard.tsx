"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { t, type Lang } from "@/lib/i18n";
import { currencyFromCents, formatDateMY, formatDateTimeMY } from "@/lib/utils";

type ReferralRow = {
  id: string;
  display_name: string | null;
  plan_tier: "free" | "pro_88" | "pro_128";
  created_at: string;
};

type EarningRow = {
  id: string;
  created_at: string;
  level: number;
  amount_cents: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REVERSED";
  event_type: "PACKAGE_PURCHASE" | "CREDIT_TOPUP";
  buyer_name: string | null;
};

type PayoutRow = {
  id: string;
  created_at: string;
  amount_cents: number;
  status: "REQUESTED" | "APPROVED" | "PAID" | "REJECTED";
  approved_at: string | null;
  paid_at: string | null;
  bank_info_json: string | null;
};

function ledgerBadge(status: EarningRow["status"]) {
  if (status === "PAID") return <Badge variant="paid">PAID</Badge>;
  if (status === "APPROVED") return <Badge variant="ai">APPROVED</Badge>;
  if (status === "REVERSED") return <Badge variant="cancelled">REVERSED</Badge>;
  return <Badge variant="pending">PENDING</Badge>;
}

function payoutBadge(status: PayoutRow["status"]) {
  if (status === "PAID") return <Badge variant="paid">PAID</Badge>;
  if (status === "APPROVED") return <Badge variant="ai">APPROVED</Badge>;
  if (status === "REJECTED") return <Badge variant="cancelled">REJECTED</Badge>;
  return <Badge variant="pending">REQUESTED</Badge>;
}

export function AffiliateDashboard({
  lang = "en",
  isLocked = false,
  referralCode,
  summary,
  availableToRequestCents,
  minPayoutCents,
  referrals,
  earnings,
  payouts,
}: {
  lang?: Lang;
  isLocked?: boolean;
  referralCode: string | null;
  summary: { pending: number; approved: number; paid: number; directCount: number; teamCount: number };
  availableToRequestCents: number;
  minPayoutCents: number;
  referrals: ReferralRow[];
  earnings: EarningRow[];
  payouts: PayoutRow[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(availableToRequestCents > 0 ? String((availableToRequestCents / 100).toFixed(2)) : "");
  const [bankInfo, setBankInfo] = useState("");
  const referralLink = useMemo(() => {
    if (!referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/?ref=${referralCode}`;
  }, [referralCode]);

  async function copyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setStatus(t(lang, "affiliate.copy_done"));
    } catch {
      setStatus(t(lang, "common.failed"));
    }
  }

  async function submitPayout() {
    setBusy(true);
    setStatus(null);
    const amountCents = Math.round(Number(amount || 0) * 100);
    const res = await fetch("/api/affiliate/payout-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents, bankInfo }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(json.error ?? t(lang, "common.failed"));
      return;
    }
    setStatus(t(lang, "common.submitted"));
    window.location.reload();
  }

  if (isLocked) {
    return (
      <div className="space-y-5">
        <AppCard className="p-6">
          <h1 className="text-2xl font-bold text-white">{t(lang, "affiliate.title")}</h1>
          <p className="mt-2 text-sm text-white/65">{t(lang, "affiliate.locked_desc")}</p>
        </AppCard>
        <AppCard className="p-6">
          <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.locked_title")}</h2>
          <p className="mt-2 text-sm text-white/65">{t(lang, "affiliate.reward_note")}</p>
          <div className="mt-4">
            <Link href="/dashboard/billing">
              <AppButton>{t(lang, "affiliate.upgrade_cta")}</AppButton>
            </Link>
          </div>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AppCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{t(lang, "affiliate.title")}</h1>
            <p className="mt-2 text-sm text-white/65">{t(lang, "affiliate.summary_desc")}</p>
          </div>
          <Badge variant="ai">{t(lang, "plan.active")}</Badge>
        </div>
      </AppCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AppCard className="p-5"><p className="text-sm text-white/60">{t(lang, "affiliate.direct_referrals")}</p><p className="mt-2 text-2xl font-semibold text-white">{summary.directCount}</p></AppCard>
        <AppCard className="p-5"><p className="text-sm text-white/60">{t(lang, "affiliate.team_size")}</p><p className="mt-2 text-2xl font-semibold text-white">{summary.teamCount}</p></AppCard>
        <AppCard className="p-5"><p className="text-sm text-white/60">{t(lang, "affiliate.pending")}</p><p className="mt-2 text-2xl font-semibold text-white">{currencyFromCents(summary.pending)}</p></AppCard>
        <AppCard className="p-5"><p className="text-sm text-white/60">{t(lang, "affiliate.approved")}</p><p className="mt-2 text-2xl font-semibold text-white">{currencyFromCents(summary.approved)}</p></AppCard>
        <AppCard className="p-5"><p className="text-sm text-white/60">{t(lang, "affiliate.paid")}</p><p className="mt-2 text-2xl font-semibold text-white">{currencyFromCents(summary.paid)}</p></AppCard>
      </div>

      <AppCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/60">{t(lang, "affiliate.referral_link")}</p>
            <p className="mt-2 break-all text-sm text-white">{referralLink || t(lang, "affiliate.no_code")}</p>
          </div>
          <AppButton variant="ai" onClick={copyLink} disabled={!referralLink}>{t(lang, "affiliate.copy_link")}</AppButton>
        </div>
        <p className="mt-3 text-sm text-white/60">{t(lang, "affiliate.reward_note")}</p>
      </AppCard>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <AppCard className="p-5">
          <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.referrals_tab")}</h2>
          <div className="mt-4 space-y-3 text-sm">
            {referrals.map((row) => (
              <div key={row.id} className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-white/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{row.display_name || t(lang, "affiliate.member")}</p>
                  <Badge variant={row.plan_tier === "free" ? "pending" : "paid"}>{row.plan_tier === "free" ? t(lang, "plan.free") : row.plan_tier === "pro_88" ? "RM88" : "RM168"}</Badge>
                </div>
                <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.joined_at")}: {formatDateMY(row.created_at)}</p>
              </div>
            ))}
            {referrals.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.no_referrals")}</p> : null}
          </div>
        </AppCard>

        <AppCard className="p-5">
          <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.payout_tab")}</h2>
          <p className="mt-2 text-sm text-white/60">{t(lang, "affiliate.request_help")}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p className="text-sm text-white/60">{t(lang, "affiliate.available_to_request")}</p>
              <p className="mt-2 text-xl font-semibold text-white">{currencyFromCents(availableToRequestCents)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p className="text-sm text-white/60">{t(lang, "affiliate.min_payout")}</p>
              <p className="mt-2 text-xl font-semibold text-white">{currencyFromCents(minPayoutCents)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-white/70">
              {t(lang, "affiliate.amount")}
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white" inputMode="decimal" />
            </label>
            <label className="text-sm text-white/70">
              {t(lang, "affiliate.bank_info")}
              <textarea value={bankInfo} onChange={(e) => setBankInfo(e.target.value)} className="mt-1 min-h-[92px] w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 py-2 text-sm text-white" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AppButton onClick={submitPayout} disabled={busy || availableToRequestCents < minPayoutCents}>{busy ? "..." : t(lang, "affiliate.submit_request")}</AppButton>
            {status ? <p className="text-sm text-white/75">{status}</p> : null}
          </div>

          <div className="mt-5 space-y-3 text-sm">
            {payouts.map((row) => (
              <div key={row.id} className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-white/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{currencyFromCents(row.amount_cents)}</p>
                  {payoutBadge(row.status)}
                </div>
                <p className="mt-1 text-xs text-white/55">{formatDateTimeMY(row.created_at)}</p>
              </div>
            ))}
            {payouts.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.no_payouts")}</p> : null}
          </div>
        </AppCard>
      </div>

      <AppCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.earnings_tab")}</h2>
            <p className="mt-1 text-sm text-white/60">{t(lang, "affiliate.earnings_desc")}</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="text-white/55">
              <tr>
                <th className="px-3 py-2">{t(lang, "affiliate.date")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.type")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.buyer")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.level")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.amount")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.status")}</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((row) => (
                <tr key={row.id} className="border-t border-white/8">
                  <td className="px-3 py-3">{formatDateTimeMY(row.created_at)}</td>
                  <td className="px-3 py-3">{row.event_type === "PACKAGE_PURCHASE" ? t(lang, "affiliate.event_package") : t(lang, "affiliate.event_topup")}</td>
                  <td className="px-3 py-3">{row.buyer_name || "-"}</td>
                  <td className="px-3 py-3">L{row.level}</td>
                  <td className="px-3 py-3 font-semibold text-white">{currencyFromCents(row.amount_cents)}</td>
                  <td className="px-3 py-3">{ledgerBadge(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {earnings.length === 0 ? <p className="mt-3 text-sm text-white/45">{t(lang, "affiliate.no_earnings")}</p> : null}
        </div>
      </AppCard>
    </div>
  );
}
