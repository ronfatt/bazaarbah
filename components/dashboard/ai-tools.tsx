"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AITools({ shopId }: { shopId?: string }) {
  const [copyResult, setCopyResult] = useState("");
  const [copyPrompt, setCopyPrompt] = useState({ storeName: "", productName: "", productDescription: "", price: "" });

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [posterBase64, setPosterBase64] = useState("");

  async function generateCopy() {
    const res = await fetch("/api/ai/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...copyPrompt, shopId }),
    });
    const json = await res.json();
    setCopyResult(json.copy ?? json.error ?? "No result");
  }

  async function generateImage() {
    const res = await fetch("/api/ai/poster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: imagePrompt, shopId }),
    });
    const json = await res.json();
    setImageBase64(json.imageBase64 ?? "");
  }

  async function compose() {
    if (!imageBase64) return;
    const res = await fetch("/api/ai/poster-compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bgBase64: imageBase64,
        title: copyPrompt.productName || "Raya Kuih",
        subtitle: copyPrompt.productDescription || "Fresh festive batch",
        price: copyPrompt.price || "MYR 39.90",
        cta: "Order Now",
        shopId,
      }),
    });
    const json = await res.json();
    setPosterBase64(json.posterBase64 ?? "");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Copy Generator</h2>
        <div className="mt-3 grid gap-2">
          <Input placeholder="Store Name" value={copyPrompt.storeName} onChange={(e) => setCopyPrompt((p) => ({ ...p, storeName: e.target.value }))} />
          <Input placeholder="Product Name" value={copyPrompt.productName} onChange={(e) => setCopyPrompt((p) => ({ ...p, productName: e.target.value }))} />
          <Input placeholder="Price" value={copyPrompt.price} onChange={(e) => setCopyPrompt((p) => ({ ...p, price: e.target.value }))} />
          <Textarea
            rows={3}
            placeholder="Product Description"
            value={copyPrompt.productDescription}
            onChange={(e) => setCopyPrompt((p) => ({ ...p, productDescription: e.target.value }))}
          />
          <Button onClick={generateCopy}>Generate Copy</Button>
          {copyResult && <Textarea rows={6} value={copyResult} readOnly />}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Poster Builder</h2>
        <Input className="mt-3" placeholder="Image prompt" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} />
        <div className="mt-3 flex gap-3">
          <Button onClick={generateImage}>Generate Background</Button>
          <Button variant="outline" onClick={compose}>
            Compose Poster
          </Button>
        </div>
        {posterBase64 && <img className="mt-4 max-w-xs rounded-xl border" src={`data:image/png;base64,${posterBase64}`} alt="Poster" />}
      </div>
    </div>
  );
}
