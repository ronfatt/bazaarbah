"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Sparkles, Wand2, Sticker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeTheme, type ShopTheme } from "@/lib/theme";
import { ImageUploader } from "@/components/ui/image-uploader";
import { t, type Lang } from "@/lib/i18n";

type CopyBundle = {
  fbCaptions: Array<{ tone: "friendly" | "urgent" | "premium"; text: string }>;
  whatsappBroadcasts: string[];
  hooks: string[];
};

type ProductPick = {
  id: string;
  name: string;
  price_cents: number | null;
  image_original_url?: string | null;
  image_url?: string | null;
};

type AiHistoryItem = {
  id: string;
  type: "product_image" | "poster" | "copy";
  createdAt: string;
  imageUrl?: string | null;
  payload?: Record<string, unknown> | null;
};

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#163C33] p-4">
      <p className="text-xs font-semibold text-[#9CA3AF]">{label}</p>
      <div className="mt-2 h-3 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-3 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-white/10" />
    </div>
  );
}

const aiBadgeClass = "inline-flex items-center px-3 py-1 rounded-full bg-[#00C2A8]/10 text-[#00C2A8] text-xs font-medium";

function formatMoney(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const numeric = Number(cleaned || 0);
  return numeric.toFixed(2);
}

export function AITools({
  shopId,
  initialTheme = "gold",
  lang = "en",
  products = [],
  history = [],
}: {
  shopId?: string;
  initialTheme?: string;
  lang?: Lang;
  products?: ProductPick[];
  history?: AiHistoryItem[];
}) {
  const [theme, setTheme] = useState<ShopTheme>(normalizeTheme(initialTheme));

  const [copyForm, setCopyForm] = useState({
    productName: "",
    keySellingPoints: "",
    price: "0.00",
    platform: "FB" as "FB" | "IG" | "TikTok" | "WhatsApp",
  });
  const [copyLang, setCopyLang] = useState<Lang>(lang);
  const [copyBundle, setCopyBundle] = useState<CopyBundle | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [imageForm, setImageForm] = useState({ productName: "", description: "" });
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [productImage, setProductImage] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);

  const [posterForm, setPosterForm] = useState({
    productName: "",
    sellingPoint: "",
    priceLabel: "MYR 0.00",
    cta: "Order Now",
    aspect: "9:16" as "16:9" | "9:16",
  });
  const [posterImage, setPosterImage] = useState<string>("");
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterProgress, setPosterProgress] = useState(0);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [enforcePhotoForPoster, setEnforcePhotoForPoster] = useState(true);
  const [historyItems, setHistoryItems] = useState<AiHistoryItem[]>(history);
  const [historyFilter, setHistoryFilter] = useState<"all" | "product_image" | "poster" | "copy">("all");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  function applyHistory(item: AiHistoryItem) {
    const payload = item.payload ?? {};
    if (item.type === "product_image") {
      const input = (payload.input as Record<string, string> | undefined) ?? {};
      setImageForm({
        productName: input.productName ?? "",
        description: input.description ?? "",
      });
      if (item.imageUrl) setProductImage(item.imageUrl);
      return;
    }
    if (item.type === "poster") {
      const input = (payload.input as Record<string, string> | undefined) ?? {};
      setPosterForm((prev) => ({
        ...prev,
        productName: input.productName ?? prev.productName,
        sellingPoint: input.sellingPoint ?? prev.sellingPoint,
        priceLabel: input.priceLabel ?? prev.priceLabel,
        cta: input.cta ?? prev.cta,
        aspect: (input.aspect as "16:9" | "9:16" | undefined) ?? prev.aspect,
      }));
      if (item.imageUrl) {
        setPosterImage(item.imageUrl);
      }
      return;
    }
    const input = (payload.input as Record<string, string> | undefined) ?? {};
    const bundle = payload.bundle as CopyBundle | undefined;
    setCopyForm((prev) => ({
      ...prev,
      productName: input.productName ?? prev.productName,
      keySellingPoints: input.keySellingPoints ?? prev.keySellingPoints,
      price: (input.price ?? prev.price).replace("MYR ", ""),
      platform: (input.platform as "FB" | "IG" | "TikTok" | "WhatsApp" | undefined) ?? prev.platform,
    }));
    if (input.lang === "en" || input.lang === "zh" || input.lang === "ms") {
      setCopyLang(input.lang);
    }
    if (bundle) setCopyBundle(bundle);
  }

  function appendHistory(item: AiHistoryItem) {
    setHistoryItems((prev) => [item, ...prev].slice(0, 30));
  }

  function previewCopyText(item: AiHistoryItem) {
    const payload = item.payload ?? {};
    const bundle = payload.bundle as CopyBundle | undefined;
    if (!bundle) return null;
    const firstCaption = bundle.fbCaptions?.[0]?.text ?? "";
    const firstWa = bundle.whatsappBroadcasts?.[0] ?? "";
    const firstHook = bundle.hooks?.[0] ?? "";
    const joined = [firstCaption, firstWa, firstHook].filter(Boolean).join(" | ");
    if (!joined) return null;
    const expanded = Boolean(expandedHistory[item.id]);
    return {
      full: joined,
      short: joined.length > 180 ? `${joined.slice(0, 180)}...` : joined,
      expanded,
    };
  }

  async function deleteHistoryItem(id: string) {
    setHistoryBusy(true);
    try {
      const res = await fetch(`/api/ai/history/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete history");
      setHistoryItems((prev) => prev.filter((x) => x.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete history";
      setCopyError(message);
    } finally {
      setHistoryBusy(false);
    }
  }

  async function clearOldHistory() {
    setHistoryBusy(true);
    try {
      const typeParam = historyFilter === "all" ? "" : `&type=${historyFilter}`;
      const res = await fetch(`/api/ai/history?olderThanDays=30${typeParam}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to clear history");
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      setHistoryItems((prev) =>
        prev.filter((item) => {
          const isOld = new Date(item.createdAt).getTime() < cutoff;
          const typeMatched = historyFilter === "all" ? true : item.type === historyFilter;
          return !(isOld && typeMatched);
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear history";
      setCopyError(message);
    } finally {
      setHistoryBusy(false);
    }
  }

  const heroTone = useMemo(() => {
    if (theme === "minimal") return "from-[#112E27] via-[#163C33] to-[#17362f]";
    if (theme === "cute") return "from-[#112E27] via-[#1d3f37] to-[#1d4b41]";
    return "from-[#112E27] via-[#163C33] to-[#0E3B2E]";
  }, [theme]);

  const posterSourceImageUrl =
    productImage.startsWith("http://") || productImage.startsWith("https://")
      ? productImage
      : uploadedImageUrl && (uploadedImageUrl.startsWith("http://") || uploadedImageUrl.startsWith("https://"))
        ? uploadedImageUrl
        : null;

  async function generateCopy() {
    setCopyLoading(true);
    setCopyError(null);
    setCopyBundle(null);
    try {
      const res = await fetch("/api/ai/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...copyForm,
          price: `MYR ${formatMoney(copyForm.price)}`,
          lang: copyLang,
          shopId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setCopyBundle(json.bundle);
      appendHistory({
        id: `tmp-copy-${Date.now()}`,
        type: "copy",
        createdAt: new Date().toISOString(),
        imageUrl: null,
        payload: {
          input: {
            productName: copyForm.productName,
            keySellingPoints: copyForm.keySellingPoints,
            price: `MYR ${formatMoney(copyForm.price)}`,
            platform: copyForm.platform,
            lang: copyLang,
          },
          bundle: json.bundle,
        },
      });
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : "Failed");
    } finally {
      setCopyLoading(false);
    }
  }

  async function uploadAiImage(file?: File) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/products/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Upload failed");
    setUploadedImageUrl(json.imageUrl as string);
  }

  async function generateProductImage() {
    setImageLoading(true);
    setImageError(null);
    setImageProgress(15);
    setProductImage("");

    const tick = window.setInterval(() => {
      setImageProgress((p) => (p < 86 ? p + 6 : p));
    }, 260);

    try {
      if (uploadedImageUrl) {
        const res = await fetch("/api/ai/enhance-product-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopId,
            originalImageUrl: uploadedImageUrl,
            productName: imageForm.productName,
            description: imageForm.description || undefined,
            style: theme === "minimal" ? "studio" : theme === "cute" ? "raya" : "premium",
            outputSize: "1024x1024",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed");
        setProductImage(json.imageEnhancedUrl);
        appendHistory({
          id: `tmp-bg-${Date.now()}`,
          type: "product_image",
          createdAt: new Date().toISOString(),
          imageUrl: json.imageEnhancedUrl,
          payload: {
            input: {
              productName: imageForm.productName,
              description: imageForm.description,
              style: theme,
            },
          },
        });
      } else {
        const res = await fetch("/api/ai/product-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...imageForm, style: theme, shopId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed");
        setProductImage(json.imageUrl ? String(json.imageUrl) : `data:image/png;base64,${json.imageBase64}`);
        appendHistory({
          id: `tmp-bg-${Date.now()}`,
          type: "product_image",
          createdAt: new Date().toISOString(),
          imageUrl: json.imageUrl ? String(json.imageUrl) : null,
          payload: {
            input: {
              productName: imageForm.productName,
              description: imageForm.description,
              style: theme,
            },
          },
        });
      }
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
    if (enforcePhotoForPoster && !posterSourceImageUrl) {
      setPosterError("Generate or upload a product photo in A first, then generate poster.");
      return;
    }
    setPosterLoading(true);
    setPosterError(null);
    setPosterProgress(12);
    setPosterImage("");

    const tick = window.setInterval(() => {
      setPosterProgress((p) => (p < 88 ? p + 6 : p));
    }, 240);

    try {
      const res = await fetch("/api/ai/poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...posterForm,
          style: theme,
          shopId,
          sourceImageUrl: posterSourceImageUrl ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setPosterImage(json.posterUrl ? String(json.posterUrl) : `data:image/png;base64,${json.posterBase64}`);
      appendHistory({
        id: `tmp-poster-${Date.now()}`,
        type: "poster",
        createdAt: new Date().toISOString(),
        imageUrl: json.posterUrl ? String(json.posterUrl) : null,
        payload: {
          input: {
            productName: posterForm.productName,
            sellingPoint: posterForm.sellingPoint,
            priceLabel: posterForm.priceLabel,
            cta: posterForm.cta,
            aspect: posterForm.aspect,
            style: theme,
          },
        },
      });
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
      <section className={`relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${heroTone} p-6`}>
        <div className="pointer-events-none absolute -left-14 -top-14 h-52 w-52 rounded-full bg-[#00C2A8]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -right-8 h-52 w-52 rounded-full bg-[#C9A227]/20 blur-3xl" />

        <div className="relative">
          <span className={aiBadgeClass}>{t(lang, "ai.bundle")}</span>
          <h2 className="mt-3 text-2xl font-bold text-[#F3F4F6]">{t(lang, "ai.bundle_title")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-[#9CA3AF]">{t(lang, "ai.bundle_desc")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["gold", "minimal", "cute"] as ShopTheme[]).map((tStyle) => (
              <button
                key={tStyle}
                onClick={() => setTheme(tStyle)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  theme === tStyle ? "border-[#C9A227] bg-[#163C33] text-[#F3F4F6]" : "border-white/20 bg-[#112E27] text-[#9CA3AF]"
                }`}
              >
                {tStyle}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-[#112E27] p-6 shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-[#F3F4F6]">
            <Sticker size={18} className="text-[#C9A227]" />
            <h3 className="text-lg font-semibold">{t(lang, "ai.product_photo_title")}</h3>
          </div>
          <div className="grid gap-2">
            <Input placeholder={t(lang, "ai.product_name_placeholder")} value={imageForm.productName} onChange={(e) => setImageForm((s) => ({ ...s, productName: e.target.value }))} />
            <Textarea rows={3} placeholder={t(lang, "ai.product_desc_placeholder")} value={imageForm.description} onChange={(e) => setImageForm((s) => ({ ...s, description: e.target.value }))} />
            <div className="rounded-xl border border-white/10 bg-[#0B241F] p-3">
              <p className="text-xs text-white/60">{t(lang, "ai.photo_upload_label")}</p>
              <ImageUploader uploading={imageLoading} onChange={uploadAiImage} previewUrl={uploadedImageUrl || undefined} label={t(lang, "ai.photo_upload_cta")} />
              <p className="mt-2 text-xs text-white/45">{t(lang, "ai.photo_upload_hint")}</p>
            </div>
            <Button variant="ai" onClick={generateProductImage} disabled={imageLoading || !imageForm.productName} className="animate-pulse">
              {imageLoading ? t(lang, "ai.generating") : uploadedImageUrl ? t(lang, "ai.enhance_photo_cta") : t(lang, "ai.generate_bg_cta")}
            </Button>
          </div>

          {imageLoading && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-[#00C2A8] transition-all" style={{ width: `${imageProgress}%` }} />
              </div>
              <p className="mt-1 text-xs text-[#9CA3AF]">{t(lang, "ai.preparing_image")} {imageProgress}%</p>
              <div className="mt-3">
                <LoadingBlock label={t(lang, "ai.loading_bg")} />
              </div>
            </div>
          )}

          {productImage && (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              <Image src={productImage} alt="AI product background" width={640} height={960} className="h-auto w-full" unoptimized />
            </div>
          )}
          {imageError && <p className="mt-3 text-sm text-rose-400">{imageError}</p>}
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#112E27] p-6 shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-[#F3F4F6]">
            <Wand2 size={18} className="text-[#C9A227]" />
            <h3 className="text-lg font-semibold">{t(lang, "ai.poster_title")}</h3>
          </div>
          <div className="grid gap-2">
            <div className="rounded-xl border border-white/10 bg-[#163C33]/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-white/70">Poster image source</p>
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={enforcePhotoForPoster}
                    onChange={(e) => setEnforcePhotoForPoster(e.target.checked)}
                  />
                  Require photo from A
                </label>
              </div>
              <p className="mt-1 text-xs text-white/50">
                {posterSourceImageUrl
                  ? "Using image from A) Product Photo Beautifier."
                  : "No linked image yet. Run A first, or disable requirement to use AI background fallback."}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-[#112E27]">
                  {posterSourceImageUrl ? (
                    <Image src={posterSourceImageUrl} alt="Poster source preview" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-white/40">No image</div>
                  )}
                </div>
                <p className="text-xs text-white/55">
                  {posterSourceImageUrl ? "This thumbnail is the current background source for B." : "Generate in A first to link a source image."}
                </p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedProductId(id);
                  const found = products.find((p) => p.id === id);
                  if (found) {
                    const price = found.price_cents ? (found.price_cents / 100).toFixed(2) : "0.00";
                    setPosterForm((s) => ({ ...s, productName: found.name, priceLabel: `MYR ${price}` }));
                    setCopyForm((s) => ({ ...s, productName: found.name, price }));
                  }
                }}
                className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
              >
                <option value="">{t(lang, "ai.select_product")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPosterForm((s) => ({
                    ...s,
                    productName: copyForm.productName || s.productName,
                    sellingPoint: copyForm.keySellingPoints || s.sellingPoint,
                    priceLabel: `MYR ${formatMoney(copyForm.price)}`,
                  }));
                }}
              >
                {t(lang, "ai.use_copy_data")}
              </Button>
            </div>
            <Input placeholder={t(lang, "ai.poster_product_placeholder")} value={posterForm.productName} onChange={(e) => setPosterForm((s) => ({ ...s, productName: e.target.value }))} />
            <Input placeholder={t(lang, "ai.poster_subtitle_placeholder")} value={posterForm.sellingPoint} onChange={(e) => setPosterForm((s) => ({ ...s, sellingPoint: e.target.value }))} />
            <div className="grid gap-2 md:grid-cols-[90px_1fr]">
              <Input value="MYR" disabled className="text-center" />
              <Input
                placeholder="0.00"
                value={posterForm.priceLabel.replace("MYR ", "")}
                onChange={(e) => {
                  const amount = e.target.value.replace(/[^0-9.]/g, "");
                  setPosterForm((s) => ({ ...s, priceLabel: `MYR ${amount}` }));
                }}
                onBlur={() => setPosterForm((s) => ({ ...s, priceLabel: `MYR ${formatMoney(s.priceLabel.replace("MYR ", ""))}` }))}
              />
            </div>
            <Input placeholder={t(lang, "ai.poster_cta_placeholder")} value={posterForm.cta} onChange={(e) => setPosterForm((s) => ({ ...s, cta: e.target.value }))} />
            <select
              value={posterForm.aspect}
              onChange={(e) => setPosterForm((s) => ({ ...s, aspect: e.target.value as "16:9" | "9:16" }))}
              className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
            <Button variant="ai" onClick={generatePoster} disabled={posterLoading || !posterForm.productName} className="animate-pulse">
              {posterLoading ? t(lang, "ai.rendering") : t(lang, "ai.generate_poster_cta")}
            </Button>
          </div>

          {posterLoading && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-[#00C2A8] transition-all" style={{ width: `${posterProgress}%` }} />
              </div>
              <p className="mt-1 text-xs text-[#9CA3AF]">{t(lang, "ai.composing_poster")} {posterProgress}%</p>
              <div className="mt-3">
                <LoadingBlock label={t(lang, "ai.poster_loading")} />
              </div>
            </div>
          )}

          {posterImage && (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              <Image src={posterImage} alt="AI poster" width={1080} height={1920} className="h-auto w-full" unoptimized />
            </div>
          )}
          {posterError && <p className="mt-3 text-sm text-rose-400">{posterError}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#112E27] p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-[#F3F4F6]">
          <Sparkles size={18} className="text-[#C9A227]" />
          <h3 className="text-lg font-semibold">{t(lang, "ai.copy_title")}</h3>
          <span className={aiBadgeClass}>{t(lang, "ai.copy_credit_badge")}</span>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Input placeholder={t(lang, "ai.product_name_placeholder")} value={copyForm.productName} onChange={(e) => setCopyForm((s) => ({ ...s, productName: e.target.value }))} />
          <div className="grid grid-cols-[90px_1fr] gap-2">
            <Input value="MYR" disabled className="text-center" />
            <Input
              placeholder="0.00"
              value={copyForm.price}
              onChange={(e) => setCopyForm((s) => ({ ...s, price: e.target.value.replace(/[^0-9.]/g, "") }))}
              onBlur={() => setCopyForm((s) => ({ ...s, price: formatMoney(s.price) }))}
            />
          </div>
          <Textarea
            rows={3}
            className="md:col-span-2"
            placeholder={t(lang, "ai.selling_points_placeholder")}
            value={copyForm.keySellingPoints}
            onChange={(e) => setCopyForm((s) => ({ ...s, keySellingPoints: e.target.value }))}
          />
          <div className="grid gap-2 md:col-span-2 md:grid-cols-[1fr_1fr]">
            <select
              value={copyForm.platform}
              onChange={(e) => setCopyForm((s) => ({ ...s, platform: e.target.value as "FB" | "IG" | "TikTok" | "WhatsApp" }))}
              className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
            >
              <option>FB</option>
              <option>IG</option>
              <option>TikTok</option>
              <option>WhatsApp</option>
            </select>
            <select
              value={copyLang}
              onChange={(e) => setCopyLang(e.target.value as Lang)}
              className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
            >
              <option value="en">English</option>
              <option value="ms">Bahasa Melayu</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <Button
            variant="ai"
            className="mt-3 animate-pulse md:col-span-2"
            onClick={generateCopy}
            disabled={copyLoading || !copyForm.productName || copyForm.keySellingPoints.length < 4}
          >
            {copyLoading ? t(lang, "ai.generating") : t(lang, "ai.generate_copy_cta")}
          </Button>
        </div>

        {copyLoading && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <LoadingBlock label="FB captions" />
            <LoadingBlock label="WhatsApp + hooks" />
          </div>
        )}

        {copyBundle && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p className="text-xs font-semibold uppercase text-[#9CA3AF]">FB Captions</p>
              <ul className="mt-2 space-y-2 text-sm text-[#F3F4F6]">
                {copyBundle.fbCaptions.map((c) => (
                  <li key={`${c.tone}-${c.text.slice(0, 12)}`}>
                    <span className="font-semibold uppercase text-[#C9A227]">[{c.tone}]</span> {c.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p className="text-xs font-semibold uppercase text-[#9CA3AF]">WhatsApp</p>
              <ul className="mt-2 space-y-2 text-sm text-[#F3F4F6]">
                {copyBundle.whatsappBroadcasts.map((s, i) => (
                  <li key={`${i}-${s.slice(0, 10)}`}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p className="text-xs font-semibold uppercase text-[#9CA3AF]">Hooks</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {copyBundle.hooks.map((h, i) => (
                  <span key={`${i}-${h.slice(0, 10)}`} className="rounded-full bg-[#00C2A8]/10 px-3 py-1 text-xs font-medium text-[#00C2A8]">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {copyError && <p className="mt-3 text-sm text-rose-400">{copyError}</p>}
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#112E27] p-6 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#F3F4F6]">AI History</h3>
          <span className="text-xs text-white/60">{historyItems.length} saved</span>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value as "all" | "product_image" | "poster" | "copy")}
            className="h-9 rounded-lg border border-white/10 bg-[#163C33] px-3 text-xs text-[#F3F4F6]"
          >
            <option value="all">All types</option>
            <option value="product_image">Background</option>
            <option value="poster">Poster</option>
            <option value="copy">Copy</option>
          </select>
          <Button type="button" variant="outline" disabled={historyBusy} onClick={clearOldHistory}>
            {historyBusy ? "Cleaning..." : "Clear older than 30 days"}
          </Button>
        </div>
        {historyItems.filter((item) => historyFilter === "all" || item.type === historyFilter).length === 0 ? (
          <p className="text-sm text-white/60">No history yet. Generate any background/poster/copy and it will appear here.</p>
        ) : (
          <div className="grid gap-3">
            {historyItems
              .filter((item) => historyFilter === "all" || item.type === historyFilter)
              .map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-[#163C33]/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {item.type === "product_image" ? "Product Background" : item.type === "poster" ? "Poster" : "Copy Bundle"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/50">{new Date(item.createdAt).toLocaleString()}</p>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={historyBusy}
                      onClick={() => deleteHistoryItem(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {item.type === "copy" ? (
                  (() => {
                    const preview = previewCopyText(item);
                    if (!preview) {
                      return <p className="mt-2 text-xs text-white/50">No text preview in this record.</p>;
                    }
                    return (
                      <div className="mt-2 rounded-lg border border-white/10 bg-[#112E27]/60 p-2">
                        <p className="text-xs text-white/80">{preview.expanded ? preview.full : preview.short}</p>
                        {preview.full.length > 180 ? (
                          <button
                            type="button"
                            className="mt-1 text-xs text-[#00C2A8] hover:underline"
                            onClick={() =>
                              setExpandedHistory((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                          >
                            {preview.expanded ? "Show less" : "Show more"}
                          </button>
                        ) : null}
                      </div>
                    );
                  })()
                ) : null}
                {item.imageUrl ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                      <Image src={item.imageUrl} alt={item.type} fill className="object-cover" unoptimized />
                    </div>
                    <a href={item.imageUrl} download className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10">
                      Download
                    </a>
                  </div>
                ) : null}
                <div className="mt-2">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => applyHistory(item)}>
                      Reuse
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
