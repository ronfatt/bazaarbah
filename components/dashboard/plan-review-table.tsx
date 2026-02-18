"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import { PLAN_LABEL } from "@/lib/plan";
import { currencyFromCents } from "@/lib/utils";
import { t, type Lang } from "@/lib/i18n";

type ReviewRow = {
  id: string;
  user_id: string;
  target_plan: "pro_88" | "pro_128";
  amount_cents: number;
  status: "pending_review" | "approved" | "rejected";
  proof_image_url: string | null;
  reference_text: string | null;
  note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
};

function statusBadge(status: ReviewRow["status"]) {
  if (status === "approved") return <Badge variant="paid">approved</Badge>;
  if (status === "rejected") return <Badge variant="cancelled">rejected</Badge>;
  return <Badge variant="pending">pending</Badge>;
}

export function PlanReviewTable({ rows, lang = "en" }: { rows: ReviewRow[]; lang?: Lang }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  async function review(id: string, action: "approve" | "reject", note?: string) {
    setBusyId(id);
    setStatus(null);
    const res = await fetch(`/api/admin/plan-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setStatus(json.error ?? "Failed");
      return;
    }
    setStatus(action === "approve" ? t(lang, "admin.approved") : t(lang, "admin.rejected"));
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#112E27]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-[#163C33] text-white/55">
            <tr>
              <th className="px-4 py-3">{t(lang, "common.seller")}</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">{t(lang, "buyer.reference_text")}</th>
              <th className="px-4 py-3">Proof</th>
              <th className="px-4 py-3">{t(lang, "dashboard.status")}</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
              const pending = row.status === "pending_review";
              return (
                <tr key={row.id} className="border-t border-white/5 text-white/80 hover:bg-[#163C33]/65">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{profile?.display_name ?? t(lang, "common.seller")}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-white/45">{row.user_id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-4 py-3">{PLAN_LABEL[row.target_plan]}</td>
                  <td className="px-4 py-3">{currencyFromCents(row.amount_cents)}</td>
                  <td className="px-4 py-3 text-white/65">{new Date(row.submitted_at).toLocaleString("en-MY")}</td>
                  <td className="px-4 py-3 text-white/65">{row.reference_text || "-"}</td>
                  <td className="px-4 py-3">
                    {row.proof_image_url ? (
                      <a href={row.proof_image_url} target="_blank" rel="noreferrer" className="text-bb-gold hover:underline">
                        Open Slip
                      </a>
                    ) : (
                      <span className="text-white/35">No file</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(row.status)}</td>
                  <td className="px-4 py-3">
                    {pending ? (
                      <div className="space-y-2">
                        <input
                          value={rejectNotes[row.id] ?? ""}
                          onChange={(e) => setRejectNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          placeholder="Reject note (optional)"
                          className="h-9 w-52 rounded-lg border border-white/10 bg-[#0B241F] px-3 text-xs text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                        />
                        <div className="flex items-center gap-2">
                          <AppButton variant="primary" onClick={() => review(row.id, "approve")} disabled={busyId === row.id} className="h-8 px-3 text-xs">
                            {busyId === row.id ? "..." : t(lang, "admin.approved")}
                          </AppButton>
                          <AppButton
                            variant="secondary"
                            onClick={() => review(row.id, "reject", rejectNotes[row.id])}
                            disabled={busyId === row.id}
                            className="h-8 px-3 text-xs"
                          >
                            {t(lang, "admin.rejected")}
                          </AppButton>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-white/45">{row.note ? `Note: ${row.note}` : "-"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-white/45">
                  -
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {status && <p className="text-sm text-white/80">{status}</p>}
    </div>
  );
}
