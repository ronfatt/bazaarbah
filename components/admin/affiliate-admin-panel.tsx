"use client";

import { useState } from "react";
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

  async function runLedger(id: string, action: "approve" | "mark_paid" | "reverse") {
    setBusy(`ledger:${id}:${action}`);
    setStatus(null);
    const res = await fetch("/api/admin/affiliate/ledger", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], action }),
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
        <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.ledger")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="text-white/55">
              <tr>
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
              {ledger.map((row) => (
                <tr key={row.id} className="border-t border-white/8">
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
                        <AppButton className="h-8 px-3 text-xs" variant="ai" onClick={() => runLedger(row.id, "approve")} disabled={Boolean(busy)}>
                          {t(lang, "affiliate.approve")}
                        </AppButton>
                      ) : null}
                      {row.status === "APPROVED" ? (
                        <AppButton className="h-8 px-3 text-xs" variant="secondary" onClick={() => runLedger(row.id, "mark_paid")} disabled={Boolean(busy)}>
                          {t(lang, "affiliate.mark_paid")}
                        </AppButton>
                      ) : null}
                      {row.status !== "REVERSED" ? (
                        <AppButton className="h-8 px-3 text-xs" variant="ghost" onClick={() => runLedger(row.id, "reverse")} disabled={Boolean(busy)}>
                          {t(lang, "affiliate.reverse")}
                        </AppButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ledger.length === 0 ? <p className="mt-3 text-sm text-white/45">{t(lang, "affiliate.none")}</p> : null}
        </div>
      </AppCard>

      <AppCard className="p-5">
        <h2 className="text-lg font-semibold text-white">{t(lang, "affiliate.payout_requests")}</h2>
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
              {payouts.map((row) => (
                <tr key={row.id} className="border-t border-white/8">
                  <td className="px-3 py-3">{formatDateTimeMY(row.created_at)}</td>
                  <td className="px-3 py-3">{row.user_name || "-"}</td>
                  <td className="px-3 py-3 font-semibold text-white">{currencyFromCents(row.amount_cents)}</td>
                  <td className="px-3 py-3">{payoutBadge(row.status)}</td>
                  <td className="px-3 py-3 text-xs text-white/60">{row.bank_info_json || "-"}</td>
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
              ))}
            </tbody>
          </table>
          {payouts.length === 0 ? <p className="mt-3 text-sm text-white/45">{t(lang, "affiliate.no_payouts")}</p> : null}
        </div>
      </AppCard>

      {status ? <p className="text-sm text-white/75">{status}</p> : null}
    </div>
  );
}
