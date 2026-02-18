"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Sparkles, Wand2, Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeTheme, type ShopTheme } from "@/lib/theme";

type CopyBundle = {
  fbCaptions: Array<{ tone: "friendly" | "urgent" | "premium"; text: string }>;
  whatsappBroadcasts: string[];
  hooks: string[];
};

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <div className="mt-2 h-3 animate-pulse rounded bg-neutral-200" />
      <div className="mt-2 h-3 animate-pulse rounded bg-neutral-200/80" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-neutral-200/60" />
    </div>
  );
}

export function AITools({ shopId, initialTheme = "gold" }: { shopId?: string; initialTheme?: string }) {
  const [theme, setTheme] = useState<ShopTheme>(normalizeTheme(initialTheme));

  const [copyForm, setCopyForm] = useState({ productName: "", keySellingPoints: "", price: "MYR 39.90", platform: "FB" as "FB" | "IG" | "TikTok" | "WhatsApp" });
  const [copyBundle, setCopyBundle] = useState<CopyBundle | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [imageForm, setImageForm] = useState({ productName: "", description: "" });
  const [productImage, setProductImage] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);

  const [posterForm, setPosterForm] = useState({ productName: "", sellingPoint: "", priceLabel: "MYR 39.90", cta: "Order Now", aspect: "9:16" as "16:9" | "9:16" });
  const [posterImage, setPosterImage] = useState<string>("");
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterProgress, setPosterProgress] = useState(0);
  const [posterError, setPosterError] = useState<string | null>(null);

  const heroTone = useMemo(() => {
    if (theme === "minimal") return "from-slate-100 via-white to-slate-50";
    if (theme === "cute") return "from-rose-50 via-pink-50 to-amber-50";
    return "from-emerald-950 via-emerald-900 to-emerald-800";
  }, [theme]);

  async function generateCopy() {
    setCopyLoading(true);
    setCopyError(null);
    setCopyBundle(null);
    try {
      const res = await fetch("/api/ai/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...copyForm, shopId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setCopyBundle(json.bundle);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : "Failed");
    } finally {
      setCopyLoading(false);
    }
  }

  async function generateProductImage() {
    setImageLoading(true);
    setImageError(null);
    setImageProgress(15);
    setProductImage("");

    const tick = window.setInterval(() => {
      setImageProgress((p) => (p < 85 ? p + 7 : p));
    }, 280);

    try {
      const res = await fetch("/api/ai/product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...imageForm, style: theme, shopId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setProductImage(json.imageBase64);
      setImageProgress(100);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Failed");
      setImageProgress(0);
    } finally {
      window.clearInterval(tick);
      setImageLoading(false);
    }
  }

  async function generatePoster() {
    setPosterLoading(true);
    setPosterError(null);
    setPosterProgress(12);
    setPosterImage("");

    const tick = window.setInterval(() => {
      setPosterProgress((p) => (p < 88 ? p + 6 : p));
    }, 260);

    try {
      const res = await fetch("/api/ai/poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...posterForm, style: theme, shopId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setPosterImage(json.posterBase64);
      setPosterProgress(100);
    } catch (error) {
      setPosterError(error instanceof Error ? error.message : "Failed");
      setPosterProgress(0);
    } finally {
      window.clearInterval(tick);
      setPosterLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${heroTone} p-6 text-white`}>
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-wider text-white/70">AI Marketing Bundle</p>
          <h2 className="mt-2 text-2xl font-bold">Product Photo + Poster + Copy</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/80">Background is AI-generated. Typography is system-rendered to avoid broken text output.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["gold", "minimal", "cute"] as ShopTheme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${theme === t ? "border-white bg-white text-neutral-900" : "border-white/40 bg-white/10 text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-neutral-900">
            <Sticker size={18} className="text-amber-600" />
            <h3 className="text-lg font-semibold">A) Product Photo Beautifier</h3>
          </div>
          <div className="grid gap-2">
            <Input placeholder="Product name" value={imageForm.productName} onChange={(e) => setImageForm((s) => ({ ...s, productName: e.target.value }))} />
            <Textarea rows={3} placeholder="Short description (optional)" value={imageForm.description} onChange={(e) => setImageForm((s) => ({ ...s, description: e.target.value }))} />
            <Button onClick={generateProductImage} disabled={imageLoading || !imageForm.productName}>
              {imageLoading ? "Generating..." : "Generate Background (1 image credit)"}
            </Button>
          </div>
          {imageLoading && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-neutral-100">
                <div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: `${imageProgress}%` }} />
              </div>
              <p className="mt-1 text-xs text-neutral-500">Preparing image... {imageProgress}%</p>
              <div className="mt-3">
                <LoadingBlock label="Generating clean background" />
              </div>
            </div>
          )}
          {productImage && (
            <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
              <Image src={`data:image/png;base64,${productImage}`} alt="AI product background" width={640} height={960} className="h-auto w-full" unoptimized />
            </div>
          )}
          {imageError && <p className="mt-3 text-sm text-rose-600">{imageError}</p>}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-neutral-900">
            <Wand2 size={18} className="text-amber-600" />
            <h3 className="text-lg font-semibold">B) Poster Generator</h3>
          </div>
          <div className="grid gap-2">
            <Input placeholder="Poster title / product" value={posterForm.productName} onChange={(e) => setPosterForm((s) => ({ ...s, productName: e.target.value }))} />
            <Input placeholder="Subtitle / key point" value={posterForm.sellingPoint} onChange={(e) => setPosterForm((s) => ({ ...s, sellingPoint: e.target.value }))} />
            <Input placeholder="Price label" value={posterForm.priceLabel} onChange={(e) => setPosterForm((s) => ({ ...s, priceLabel: e.target.value }))} />
            <Input placeholder="CTA" value={posterForm.cta} onChange={(e) => setPosterForm((s) => ({ ...s, cta: e.target.value }))} />
            <select
              value={posterForm.aspect}
              onChange={(e) => setPosterForm((s) => ({ ...s, aspect: e.target.value as "16:9" | "9:16" }))}
              className="h-10 rounded-xl border border-neutral-300 px-3 text-sm"
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
            <Button onClick={generatePoster} disabled={posterLoading || !posterForm.productName}>
              {posterLoading ? "Rendering..." : "Generate Poster (1 poster credit)"}
            </Button>
          </div>

          {posterLoading && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-neutral-100">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${posterProgress}%` }} />
              </div>
              <p className="mt-1 text-xs text-neutral-500">Composing text-safe poster... {posterProgress}%</p>
              <div className="mt-3">
                <LoadingBlock label="AI background + system typography" />
              </div>
            </div>
          )}

          {posterImage && (
            <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
              <Image src={`data:image/png;base64,${posterImage}`} alt="AI poster" width={1080} height={1920} className="h-auto w-full" unoptimized />
            </div>
          )}
          {posterError && <p className="mt-3 text-sm text-rose-600">{posterError}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-neutral-900">
          <Sparkles size={18} className="text-amber-600" />
          <h3 className="text-lg font-semibold">C) Copy Generator</h3>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder="Product name" value={copyForm.productName} onChange={(e) => setCopyForm((s) => ({ ...s, productName: e.target.value }))} />
          <Input placeholder="Price" value={copyForm.price} onChange={(e) => setCopyForm((s) => ({ ...s, price: e.target.value }))} />
          <Textarea
            rows={3}
            className="md:col-span-2"
            placeholder="Key selling points"
            value={copyForm.keySellingPoints}
            onChange={(e) => setCopyForm((s) => ({ ...s, keySellingPoints: e.target.value }))}
          />
          <select
            value={copyForm.platform}
            onChange={(e) => setCopyForm((s) => ({ ...s, platform: e.target.value as "FB" | "IG" | "TikTok" | "WhatsApp" }))}
            className="h-10 rounded-xl border border-neutral-300 px-3 text-sm md:col-span-2"
          >
            <option>FB</option>
            <option>IG</option>
            <option>TikTok</option>
            <option>WhatsApp</option>
          </select>
        </div>

        <Button className="mt-3" onClick={generateCopy} disabled={copyLoading || !copyForm.productName || !copyForm.keySellingPoints}>
          {copyLoading ? "Generating..." : "Generate Copy Bundle (1 copy credit)"}
        </Button>

        {copyLoading && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <LoadingBlock label="FB captions" />
            <LoadingBlock label="WhatsApp + hooks" />
          </div>
        )}

        {copyBundle && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">FB Captions</p>
              <ul className="mt-2 space-y-2 text-sm text-neutral-700">
                {copyBundle.fbCaptions.map((c) => (
                  <li key={`${c.tone}-${c.text.slice(0, 12)}`}>
                    <span className="font-semibold uppercase text-neutral-900">[{c.tone}]</span> {c.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">WhatsApp Broadcasts</p>
              <ul className="mt-2 space-y-2 text-sm text-neutral-700">
                {copyBundle.whatsappBroadcasts.map((s, i) => (
                  <li key={`${i}-${s.slice(0, 10)}`}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">Hooks</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {copyBundle.hooks.map((h, i) => (
                  <span key={`${i}-${h.slice(0, 10)}`} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {copyError && <p className="mt-3 text-sm text-rose-600">{copyError}</p>}
      </section>
    </div>
  );
}
