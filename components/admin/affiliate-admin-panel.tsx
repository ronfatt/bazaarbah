"use client";

import { useMemo, useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { t, type Lang } from "@/lib/i18n";
import { currencyFromCents, formatDateTimeMY } from "@/lib/utils";

type LedgerRow = {
  id: string;
  created_at: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REVERSED";
  level: number;
  amount_cents: number;
  event_type: "PACKAGE_PURCHASE" | "CREDIT_TOPUP";
  earner_name: string | null;
  buyer_name: string | null;
};

type PayoutRow = {
  id: string;
  created_at: string;
  status: "REQUESTED" | "APPROVED" | "PAID" | "REJECTED";
  amount_cents: number;
  user_name: string | null;
  bank_info_json: string | null;
};

type PayoutBankInfo = {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  note?: string;
};

function ledgerBadge(status: LedgerRow["status"]) {
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

export function AffiliateAdminPanel({
  lang = "en",
  ledger,
  payouts,
}: {
  lang?: Lang;
  ledger: LedgerRow[];
  payouts: PayoutRow[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<LedgerRow["status"] | "ALL">("ALL");
  const [payoutSearch, setPayoutSearch] = useState("");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<PayoutRow["status"] | "ALL">("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return ledger.filter((row) => {
      const matchStatus = ledgerStatusFilter === "ALL" ? true : row.status === ledgerStatusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      const haystack = `${row.earner_name ?? ""} ${row.buyer_name ?? ""} ${row.event_type} ${row.status}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [ledger, ledgerSearch, ledgerStatusFilter]);

  const filteredPayouts = useMemo(() => {
    const q = payoutSearch.trim().toLowerCase();
    return payouts.filter((row) => {
      const bank = parseBankInfo(row.bank_info_json);
      const matchStatus = payoutStatusFilter === "ALL" ? true : row.status === payoutStatusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      const haystack = `${row.user_name ?? ""} ${bank.bankName ?? ""} ${bank.accountName ?? ""} ${bank.accountNumber ?? ""} ${bank.note ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [payouts, payoutSearch, payoutStatusFilter]);

  const allVisibleSelected = filteredLedger.length > 0 && filteredLedger.every((row) => selectedIds.includes(row.id));
  const selectedRows = ledger.filter((row) => selectedIds.includes(row.id));
  const selectedStatusSet = Array.from(new Set(selectedRows.map((row) => row.status)));
  const selectedStatus = selectedStatusSet.length === 1 ? selectedStatusSet[0] : null;
  const batchStatusError = selectedIds.length > 0 && selectedStatusSet.length > 1 ? t(lang, "affiliate.batch_same_status_only") : null;
  const canBatchApprove = selectedIds.length > 0 && selectedStatus === "PENDING";
  const canBatchMarkPaid = selectedIds.length > 0 && selectedStatus === "APPROVED";
  const canBatchReverse = selectedIds.length > 0 && selectedStatus !== null && selectedStatus !== "REVERSED";
  const payoutExportHref = `/api/admin/affiliate/payout-requests/export?${new URLSearchParams({ q: payoutSearch, status: payoutStatusFilter }).toString()}`;

  function toggleLedger(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !filteredLedger.some((row) => row.id === id));
      }
      return Array.from(new Set([...prev, ...filteredLedger.map((row) => row.id)]));
    });
  }

  async function runLedger(ids: string[], action: "approve" | "mark_paid" | "reverse") {
    if (!ids.length) return;
    setBusy(`ledger:${action}`);
    setStatus(null);
    const res = await fetch("/api/admin/affiliate/ledger", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setStatus(json.error ?? t(lang, "common.failed"));
      return;
    }
    setStatus(t(lang, "common.ok"));
    window.location.reload();
  }

  async function runPayout(id: string, action: "approve" | "mark_paid" | "reject") {
    setBusy(`payout:${id}:${action}`);
    setStatus(null);
    const res = await fetch(`/api/admin/affiliate/payout-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setStatus(json.error ?? t(lang, "common.failed"));
      return;
    }
    setStatus(t(lang, "common.ok"));
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <AppCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.ledger")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder={t(lang, "affiliate.search_placeholder")}
              className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white placeholder:text-white/30"
            />
            <select
              value={ledgerStatusFilter}
              onChange={(e) => setLedgerStatusFilter(e.target.value as LedgerRow["status"] | "ALL")}
              className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
            >
              <option value="ALL">{t(lang, "affiliate.filter_all")}</option>
              <option value="PENDING">{t(lang, "affiliate.filter_pending")}</option>
              <option value="APPROVED">{t(lang, "affiliate.filter_approved")}</option>
              <option value="PAID">{t(lang, "affiliate.filter_paid")}</option>
              <option value="REVERSED">{t(lang, "affiliate.filter_reversed")}</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AppButton className="h-8 px-3 text-xs" variant="ghost" onClick={toggleAllVisible} disabled={!filteredLedger.length || Boolean(busy)}>
            {allVisibleSelected ? t(lang, "affiliate.clear_selection") : t(lang, "affiliate.select_all")}
          </AppButton>
          <span className="text-xs text-white/55">{selectedIds.length} {t(lang, "affiliate.selected_count")}</span>
          <AppButton className="h-8 px-3 text-xs" variant="ai" onClick={() => runLedger(selectedIds, "approve")} disabled={!canBatchApprove || Boolean(busy)}>
            {t(lang, "affiliate.approve")}
          </AppButton>
          <AppButton className="h-8 px-3 text-xs" variant="secondary" onClick={() => runLedger(selectedIds, "mark_paid")} disabled={!canBatchMarkPaid || Boolean(busy)}>
            {t(lang, "affiliate.mark_paid")}
          </AppButton>
          <AppButton className="h-8 px-3 text-xs" variant="ghost" onClick={() => runLedger(selectedIds, "reverse")} disabled={!canBatchReverse || Boolean(busy)}>
            {t(lang, "affiliate.reverse")}
          </AppButton>
        </div>
        {batchStatusError ? <p className="mt-2 text-sm text-rose-300">{batchStatusError}</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="text-white/55">
              <tr>
                <th className="px-3 py-2">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                </th>
                <th className="px-3 py-2">{t(lang, "affiliate.date")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.earner")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.buyer")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.type")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.level")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.amount")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.status")}</th>
                <th className="px-3 py-2">{t(lang, "common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((row) => (
                <tr key={row.id} className="border-t border-white/8">
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleLedger(row.id)} />
                  </td>
                  <td className="px-3 py-3">{formatDateTimeMY(row.created_at)}</td>
                  <td className="px-3 py-3">{row.earner_name || "-"}</td>
                  <td className="px-3 py-3">{row.buyer_name || "-"}</td>
                  <td className="px-3 py-3">{row.event_type === "PACKAGE_PURCHASE" ? t(lang, "affiliate.event_package") : t(lang, "affiliate.event_topup")}</td>
                  <td className="px-3 py-3">L{row.level}</td>
                  <td className="px-3 py-3 font-semibold text-white">{currencyFromCents(row.amount_cents)}</td>
                  <td className="px-3 py-3">{ledgerBadge(row.status)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "PENDING" ? (
                        <AppButton className="h-8 px-3 text-xs" variant="ai" onClick={() => runLedger([row.id], "approve")} disabled={Boolean(busy)}>
                          {t(lang, "affiliate.approve")}
                        </AppButton>
                      ) : null}
                      {row.status === "APPROVED" ? (
                        <AppButton className="h-8 px-3 text-xs" variant="secondary" onClick={() => runLedger([row.id], "mark_paid")} disabled={Boolean(busy)}>
                          {t(lang, "affiliate.mark_paid")}
                        </AppButton>
                      ) : null}
                      {row.status !== "REVERSED" ? (
                        <AppButton className="h-8 px-3 text-xs" variant="ghost" onClick={() => runLedger([row.id], "reverse")} disabled={Boolean(busy)}>
                          {t(lang, "affiliate.reverse")}
                        </AppButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLedger.length === 0 ? <p className="mt-3 text-sm text-white/45">{t(lang, "affiliate.none")}</p> : null}
        </div>
      </AppCard>

      <AppCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.payout_requests")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={payoutSearch}
              onChange={(e) => setPayoutSearch(e.target.value)}
              placeholder={t(lang, "affiliate.payout_search_placeholder")}
              className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white placeholder:text-white/30"
            />
            <select
              value={payoutStatusFilter}
              onChange={(e) => setPayoutStatusFilter(e.target.value as PayoutRow["status"] | "ALL")}
              className="h-10 rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white"
            >
              <option value="ALL">{t(lang, "affiliate.filter_all")}</option>
              <option value="REQUESTED">{t(lang, "affiliate.filter_requested")}</option>
              <option value="APPROVED">{t(lang, "affiliate.filter_approved")}</option>
              <option value="PAID">{t(lang, "affiliate.filter_paid")}</option>
              <option value="REJECTED">{t(lang, "affiliate.filter_rejected")}</option>
            </select>
            <a href={payoutExportHref}>
              <AppButton className="h-10 px-4 text-sm" variant="ghost">{t(lang, "affiliate.export_csv")}</AppButton>
            </a>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="text-white/55">
              <tr>
                <th className="px-3 py-2">{t(lang, "affiliate.date")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.member")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.amount")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.status")}</th>
                <th className="px-3 py-2">{t(lang, "affiliate.bank_info")}</th>
                <th className="px-3 py-2">{t(lang, "common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.map((row) => {
                const bank = parseBankInfo(row.bank_info_json);
                return (
                  <tr key={row.id} className="border-t border-white/8 align-top">
                    <td className="px-3 py-3">{formatDateTimeMY(row.created_at)}</td>
                    <td className="px-3 py-3">{row.user_name || "-"}</td>
                    <td className="px-3 py-3 font-semibold text-white">{currencyFromCents(row.amount_cents)}</td>
                    <td className="px-3 py-3">{payoutBadge(row.status)}</td>
                    <td className="px-3 py-3 text-xs text-white/60">
                      <p>{t(lang, "affiliate.bank_name")}: {bank.bankName || "-"}</p>
                      <p>{t(lang, "affiliate.account_name")}: {bank.accountName || "-"}</p>
                      <p>{t(lang, "affiliate.account_number")}: {bank.accountNumber || "-"}</p>
                      {bank.note ? <p>{t(lang, "affiliate.payout_note")}: {bank.note}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.status === "REQUESTED" ? (
                          <AppButton className="h-8 px-3 text-xs" variant="ai" onClick={() => runPayout(row.id, "approve")} disabled={Boolean(busy)}>
                            {t(lang, "affiliate.approve")}
                          </AppButton>
                        ) : null}
                        {row.status === "APPROVED" ? (
                          <AppButton className="h-8 px-3 text-xs" variant="secondary" onClick={() => runPayout(row.id, "mark_paid")} disabled={Boolean(busy)}>
                            {t(lang, "affiliate.mark_paid")}
                          </AppButton>
                        ) : null}
                        {row.status === "REQUESTED" || row.status === "APPROVED" ? (
                          <AppButton className="h-8 px-3 text-xs" variant="ghost" onClick={() => runPayout(row.id, "reject")} disabled={Boolean(busy)}>
                            {t(lang, "affiliate.reject")}
                          </AppButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPayouts.length === 0 ? <p className="mt-3 text-sm text-white/45">{t(lang, "affiliate.no_payouts")}</p> : null}
        </div>
      </AppCard>

      {status ? <p className="text-sm text-white/75">{status}</p> : null}
    </div>
  );
}
