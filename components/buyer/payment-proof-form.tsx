"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t, type Lang } from "@/lib/i18n";

export function PaymentProofForm({ orderCode, lang = "en" }: { orderCode: string; lang?: Lang }) {
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit() {
    setStatus(t(lang, "buyer.submitting"));
    const res = await fetch(`/api/orders/by-code/${orderCode}/proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofImageUrl, referenceText }),
    });
    const json = await res.json();
    setStatus(res.ok ? t(lang, "buyer.proof_ok") : json.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  async function onMarkPaid() {
    setStatus(t(lang, "buyer.submitting"));
    const res = await fetch(`/api/orders/by-code/${orderCode}/proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    setStatus(res.ok ? t(lang, "buyer.proof_ok") : json.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{t(lang, "buyer.submit_proof")}</h2>
      <Input value={referenceText} onChange={(e) => setReferenceText(e.target.value)} placeholder={t(lang, "buyer.reference_text")} />
      <Input value={proofImageUrl} onChange={(e) => setProofImageUrl(e.target.value)} placeholder={t(lang, "buyer.proof_url")} />
      <Button variant="outline" onClick={onMarkPaid}>{t(lang, "buyer.i_paid")}</Button>
      <Button onClick={onSubmit}>{t(lang, "buyer.submit")}</Button>
      {status && <p className="text-sm text-neutral-600">{status}</p>}
    </div>
  );
}
