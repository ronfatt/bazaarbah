"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";

export function OrderActions({ orderId, canMarkPaid }: { orderId: string; canMarkPaid: boolean }) {
  const [status, setStatus] = useState<string | null>(null);

  async function markPaid() {
    setStatus("Marking paid...");
    const res = await fetch(`/api/orders/${orderId}/mark-paid`, { method: "POST" });
    setStatus(res.ok ? "Paid." : "Failed.");
    if (res.ok) window.location.reload();
  }

  async function createReceipt() {
    setStatus("Generating receipt...");
    const res = await fetch(`/api/orders/${orderId}/receipt`, { method: "POST" });
    setStatus(res.ok ? "Receipt generated." : "Failed.");
    if (res.ok) window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-3">
      {canMarkPaid && <AppButton onClick={markPaid}>Mark Paid</AppButton>}
      <AppButton variant="secondary" onClick={createReceipt}>
        Generate Receipt Record
      </AppButton>
      <a href={`/api/orders/${orderId}/receipt`} target="_blank" rel="noreferrer">
        <AppButton variant="secondary">Download PDF</AppButton>
      </a>
      {status && <p className="w-full text-sm text-bb-muted">{status}</p>}
    </div>
  );
}
