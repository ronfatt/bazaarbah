"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { t, type Lang } from "@/lib/i18n";
import Link from "next/link";

export function OrderActions({ orderId, canMarkPaid, readOnly = false, lang = "en" }: { orderId: string; canMarkPaid: boolean; readOnly?: boolean; lang?: Lang }) {
  const [status, setStatus] = useState<string | null>(null);

  async function markPaid() {
    if (readOnly) return;
    setStatus("...");
    const res = await fetch(`/api/orders/${orderId}/mark-paid`, { method: "POST" });
    setStatus(res.ok ? t(lang, "dashboard.paid") : "Failed.");
    if (res.ok) window.location.reload();
  }

  async function createReceipt() {
    if (readOnly) return;
    setStatus("...");
    const res = await fetch(`/api/orders/${orderId}/receipt`, { method: "POST" });
    setStatus(res.ok ? "OK" : "Failed.");
    if (res.ok) window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-3">
      {canMarkPaid && <AppButton onClick={markPaid} disabled={readOnly}>{t(lang, "dashboard.paid")}</AppButton>}
      <AppButton variant="secondary" onClick={createReceipt} disabled={readOnly}>
        Generate Receipt
      </AppButton>
      <a href={`/api/orders/${orderId}/receipt`} target="_blank" rel="noreferrer">
        <AppButton variant="secondary">Download PDF</AppButton>
      </a>
      {readOnly ? (
        <p className="w-full text-xs text-amber-200">
          Free plan is view-only for order actions. <Link href="/dashboard/billing" className="underline">Upgrade in Billing</Link>.
        </p>
      ) : null}
      {status && <p className="w-full text-sm text-bb-muted">{status}</p>}
    </div>
  );
}
