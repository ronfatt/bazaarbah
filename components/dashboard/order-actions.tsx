"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { t, type Lang } from "@/lib/i18n";

export function OrderActions({ orderId, canMarkPaid, lang = "en" }: { orderId: string; canMarkPaid: boolean; lang?: Lang }) {
  const [status, setStatus] = useState<string | null>(null);

  async function markPaid() {
    setStatus("...");
    const res = await fetch(`/api/orders/${orderId}/mark-paid`, { method: "POST" });
    setStatus(res.ok ? t(lang, "dashboard.paid") : "Failed.");
    if (res.ok) window.location.reload();
  }

  async function createReceipt() {
    setStatus("...");
    const res = await fetch(`/api/orders/${orderId}/receipt`, { method: "POST" });
    setStatus(res.ok ? "OK" : "Failed.");
    if (res.ok) window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-3">
      {canMarkPaid && <AppButton onClick={markPaid}>{t(lang, "dashboard.paid")}</AppButton>}
      <AppButton variant="secondary" onClick={createReceipt}>
        Generate Receipt
      </AppButton>
      <a href={`/api/orders/${orderId}/receipt`} target="_blank" rel="noreferrer">
        <AppButton variant="secondary">Download PDF</AppButton>
      </a>
      {status && <p className="w-full text-sm text-bb-muted">{status}</p>}
    </div>
  );
}
