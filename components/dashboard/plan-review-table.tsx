"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import { PLAN_LABEL } from "@/lib/plan";
import { currencyFromCents } from "@/lib/utils";

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

export function PlanReviewTable({ rows }: { rows: ReviewRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setStatus(null);
    const res = await fetch(`/api/admin/plan-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setStatus(json.error ?? "Update failed");
      return;
    }
    setStatus(action === "approve" ? "Request approved." : "Request rejected.");
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return (
          <div key={row.id} className="rounded-xl border border-white/10 bg-[#163C33] p-4 text-sm text-white/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">{profile?.display_name ?? row.user_id}</p>
              {statusBadge(row.status)}
            </div>
            <p className="mt-1">
              {PLAN_LABEL[row.target_plan]} • {currencyFromCents(row.amount_cents)}
            </p>
            <p className="mt-1 text-white/65">Submitted: {new Date(row.submitted_at).toLocaleString("en-MY")}</p>
            {row.reference_text && <p className="mt-1 text-white/65">Ref: {row.reference_text}</p>}
            {row.proof_image_url && (
              <a href={row.proof_image_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-bb-gold hover:underline">
                Open bank slip
              </a>
            )}
            {row.note && <p className="mt-1 text-rose-300">Note: {row.note}</p>}

            {row.status === "pending_review" && (
              <div className="mt-3 flex items-center gap-2">
                <AppButton variant="primary" onClick={() => review(row.id, "approve")} disabled={busyId === row.id}>
                  {busyId === row.id ? "Processing..." : "Approve"}
                </AppButton>
                <AppButton variant="secondary" onClick={() => review(row.id, "reject")} disabled={busyId === row.id}>
                  Reject
                </AppButton>
              </div>
            )}
          </div>
        );
      })}
      {rows.length === 0 && <p className="text-sm text-white/45">No plan requests yet.</p>}
      {status && <p className="text-sm text-white/80">{status}</p>}
    </div>
  );
}

