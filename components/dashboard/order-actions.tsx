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
    setStatus(res.ok ? t(lang, "dashboard.paid") : t(lang, "common.failed"));
    if (res.ok) window.location.reload();
  }

  async function createReceipt() {
    if (readOnly) return;
    setStatus("...");
    const res = await fetch(`/api/orders/${orderId}/receipt`, { method: "POST" });
    setStatus(res.ok ? t(lang, "common.ok") : t(lang, "common.failed"));
    if (res.ok) window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-3">
      {canMarkPaid && <AppButton onClick={markPaid} disabled={readOnly}>{t(lang, "dashboard.paid")}</AppButton>}
      <AppButton variant="secondary" onClick={createReceipt} disabled={readOnly}>
        {t(lang, "orders.generate_receipt")}
      </AppButton>
      <a href={`/api/orders/${orderId}/receipt`} target="_blank" rel="noreferrer">
        <AppButton variant="secondary">{t(lang, "orders.download_pdf")}</AppButton>
      </a>
      {readOnly ? (
        <p className="w-full text-xs text-amber-200">
          {t(lang, "orders.view_only_hint")} <Link href="/dashboard/billing" className="underline">{t(lang, "orders.upgrade_billing")}</Link>.
        </p>
      ) : null}
      {status && <p className="w-full text-sm text-bb-muted">{status}</p>}
    </div>
  );
}
