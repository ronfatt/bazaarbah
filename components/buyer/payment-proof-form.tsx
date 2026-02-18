"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentProofForm({ orderCode }: { orderCode: string }) {
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit() {
    setStatus("Submitting...");
    const res = await fetch(`/api/orders/by-code/${orderCode}/proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofImageUrl, referenceText }),
    });
    const json = await res.json();
    setStatus(res.ok ? "Proof submitted." : json.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Submit Payment Proof</h2>
      <Input value={referenceText} onChange={(e) => setReferenceText(e.target.value)} placeholder="Reference text" />
      <Input value={proofImageUrl} onChange={(e) => setProofImageUrl(e.target.value)} placeholder="Proof image URL (optional)" />
      <Button onClick={onSubmit}>Submit Proof</Button>
      {status && <p className="text-sm text-neutral-600">{status}</p>}
    </div>
  );
}
