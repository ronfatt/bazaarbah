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

type TeamTreeRow = {
  id: string;
  display_name: string | null;
  plan_tier: "free" | "pro_88" | "pro_128";
  created_at: string;
  is_affiliate_enabled: boolean;
  parent_name: string | null;
  children_count: number;
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

type PayoutBankInfo = {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  note?: string;
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

function parseBankInfo(raw: string | null): PayoutBankInfo {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PayoutBankInfo;
  } catch {
    return { note: raw };
  }
}

export function AffiliateDashboard({
  lang = "en",
  isLocked = false,
  referralCode,
  summary,
  availableToRequestCents,
  minPayoutCents,
  referrals,
  teamTree,
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
  teamTree: { level1: TeamTreeRow[]; level2: TeamTreeRow[]; level3: TeamTreeRow[] };
  earnings: EarningRow[];
  payouts: PayoutRow[];
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(availableToRequestCents > 0 ? String((availableToRequestCents / 100).toFixed(2)) : "");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EarningRow["status"] | "ALL">("ALL");
  const referralLink = useMemo(() => {
    if (!referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/?ref=${referralCode}`;
  }, [referralCode]);

  const filteredReferrals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return referrals;
    return referrals.filter((row) => `${row.display_name ?? ""} ${row.plan_tier}`.toLowerCase().includes(q));
  }, [referrals, search]);

  const filteredTeamTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filterRows = (rows: TeamTreeRow[]) =>
      rows.filter((row) => {
        if (!q) return true;
        const haystack = `${row.display_name ?? ""} ${row.parent_name ?? ""} ${row.plan_tier}`.toLowerCase();
        return haystack.includes(q);
      });
    return {
      level1: filterRows(teamTree.level1),
      level2: filterRows(teamTree.level2),
      level3: filterRows(teamTree.level3),
    };
  }, [teamTree, search]);

  const filteredEarnings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return earnings.filter((row) => {
      const matchStatus = statusFilter === "ALL" ? true : row.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      const haystack = `${row.buyer_name ?? ""} ${row.event_type} ${row.status} L${row.level}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [earnings, search, statusFilter]);

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
      body: JSON.stringify({
        amountCents,
        bankInfo: { bankName, accountName, accountNumber, note: payoutNote },
      }),
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

      <AppCard className="p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(lang, "affiliate.search_placeholder")}
            className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white placeholder:text-white/30"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EarningRow["status"] | "ALL")}
            className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
          >
            <option value="ALL">{t(lang, "affiliate.filter_all")}</option>
            <option value="PENDING">{t(lang, "affiliate.filter_pending")}</option>
            <option value="APPROVED">{t(lang, "affiliate.filter_approved")}</option>
            <option value="PAID">{t(lang, "affiliate.filter_paid")}</option>
            <option value="REVERSED">{t(lang, "affiliate.filter_reversed")}</option>
          </select>
        </div>
      </AppCard>

      <AppCard className="p-5">
        <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.team_tree")}</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {([
            ["level1", t(lang, "affiliate.level_1")],
            ["level2", t(lang, "affiliate.level_2")],
            ["level3", t(lang, "affiliate.level_3")],
          ] as const).map(([key, label]) => {
            const rows = filteredTeamTree[key];
            return (
              <div key={key} className="rounded-2xl border border-white/10 bg-[#163C33] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{label}</h3>
                  <Badge variant="neutral">{rows.length}</Badge>
                </div>
                <div className="mt-3 space-y-3">
                  {rows.map((row) => (
                    <div key={row.id} className="rounded-xl border border-white/10 bg-[#0B241F] p-3 text-sm text-white/80">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{row.display_name || t(lang, "affiliate.member")}</p>
                        <Badge variant={row.is_affiliate_enabled ? "ai" : "neutral"}>
                          {row.is_affiliate_enabled ? t(lang, "affiliate.enabled_badge") : t(lang, "affiliate.locked_badge")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.current_plan")}: {row.plan_tier === "free" ? t(lang, "plan.free") : row.plan_tier === "pro_88" ? "RM88" : "RM168"}</p>
                      <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.joined_at")}: {formatDateMY(row.created_at)}</p>
                      <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.under")}: {row.parent_name || "-"}</p>
                      <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.children_count")}: {row.children_count}</p>
                    </div>
                  ))}
                  {rows.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.team_empty")}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </AppCard>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <AppCard className="p-5">
          <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.referrals_tab")}</h2>
          <div className="mt-4 space-y-3 text-sm">
            {filteredReferrals.map((row) => (
              <div key={row.id} className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-white/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{row.display_name || t(lang, "affiliate.member")}</p>
                  <Badge variant={row.plan_tier === "free" ? "pending" : "paid"}>{row.plan_tier === "free" ? t(lang, "plan.free") : row.plan_tier === "pro_88" ? "RM88" : "RM168"}</Badge>
                </div>
                <p className="mt-1 text-xs text-white/55">{t(lang, "affiliate.joined_at")}: {formatDateMY(row.created_at)}</p>
              </div>
            ))}
            {filteredReferrals.length === 0 ? <p className="text-sm text-white/45">{t(lang, "affiliate.no_referrals")}</p> : null}
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
              {t(lang, "affiliate.bank_name")}
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white" />
            </label>
            <label className="text-sm text-white/70">
              {t(lang, "affiliate.account_name")}
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white" />
            </label>
            <label className="text-sm text-white/70">
              {t(lang, "affiliate.account_number")}
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white" />
            </label>
          </div>
          <label className="mt-3 block text-sm text-white/70">
            {t(lang, "affiliate.payout_note")}
            <textarea value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)} className="mt-1 min-h-[92px] w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 py-2 text-sm text-white" />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AppButton onClick={submitPayout} disabled={busy || availableToRequestCents < minPayoutCents}>{busy ? "..." : t(lang, "affiliate.submit_request")}</AppButton>
            {status ? <p className="text-sm text-white/75">{status}</p> : null}
          </div>

          <div className="mt-5 space-y-3 text-sm">
            {payouts.map((row) => {
              const bank = parseBankInfo(row.bank_info_json);
              return (
                <div key={row.id} className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-white/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{currencyFromCents(row.amount_cents)}</p>
                    {payoutBadge(row.status)}
                  </div>
                  <p className="mt-1 text-xs text-white/55">{formatDateTimeMY(row.created_at)}</p>
                  <div className="mt-2 text-xs text-white/60">
                    <p>{t(lang, "affiliate.bank_name")}: {bank.bankName || "-"}</p>
                    <p>{t(lang, "affiliate.account_name")}: {bank.accountName || "-"}</p>
                    <p>{t(lang, "affiliate.account_number")}: {bank.accountNumber || "-"}</p>
                    {bank.note ? <p>{t(lang, "affiliate.payout_note")}: {bank.note}</p> : null}
                  </div>
                </div>
              );
            })}
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
              {filteredEarnings.map((row) => (
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
          {filteredEarnings.length === 0 ? <p className="mt-3 text-sm text-white/45">{t(lang, "affiliate.no_earnings")}</p> : null}
        </div>
      </AppCard>
    </div>
  );
}
