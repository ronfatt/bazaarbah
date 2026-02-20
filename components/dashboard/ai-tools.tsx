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
import { formatDateTimeMY } from "@/lib/utils";

type CopyBundle = {
  fbCaptions: Array<{ tone: "friendly" | "urgent" | "premium"; text: string }>;
  whatsappBroadcasts: string[];
  hooks: string[];
};
type PosterCopyFields = {
  title?: string;
  subtitle?: string;
  cta?: string;
  priceText?: string;
  footer?: string;
  promoLine?: string;
  bullets?: string[];
};

type ProductPick = {
  id: string;
  name: string;
  description?: string | null;
  price_cents: number | null;
  image_enhanced_url?: string | null;
  image_source?: "original" | "enhanced" | null;
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

type FestivalMode = "generic" | "ramadan" | "raya" | "cny" | "deepavali" | "christmas" | "valentine" | "birthday" | "none";
type CampaignObjective = "flash_sale" | "new_launch" | "preorder" | "limited" | "bundle" | "free_delivery" | "whatsapp";
type PosterDesignStyle = "premium" | "festive" | "minimal" | "retail" | "cute";
type PosterRatio = "9:16" | "1:1" | "4:5";
type PosterPresetName = "retail_badge" | "hero_center" | "split_panel" | "premium_editorial" | "cta_stripe" | "diagonal_energy";

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
  creditCosts = { copy: 1, product_image: 1, poster: 1 },
  shopProfile,
}: {
  shopId?: string;
  initialTheme?: string;
  lang?: Lang;
  products?: ProductPick[];
  history?: AiHistoryItem[];
  creditCosts?: { copy: number; product_image: number; poster: number };
  shopProfile?: { shopName?: string; whatsapp?: string; shopSlug?: string };
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

  const [imageForm, setImageForm] = useState<{ productName: string; description: string; aspect: "1:1" | "16:9" | "9:16" }>({
    productName: "",
    description: "",
    aspect: "1:1",
  });
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [productImage, setProductImage] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);

  const [posterForm, setPosterForm] = useState({
    productName: "",
    description: "",
    headline: "",
    subheadline: "",
    bullet1: "",
    bullet2: "",
    bullet3: "",
    priceLabel: "MYR 0.00",
    cta: "Order Now",
    footer: "",
    ratio: "9:16" as PosterRatio,
    festival: "generic" as FestivalMode,
    objective: "flash_sale" as CampaignObjective,
    designStyle: "retail" as PosterDesignStyle,
  });
  const [posterJobId, setPosterJobId] = useState<string>("");
  const [posterBackgroundUrl, setPosterBackgroundUrl] = useState<string>("");
  const [posterPreset, setPosterPreset] = useState<PosterPresetName | "">("");
  const [posterImage, setPosterImage] = useState<string>("");
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterCopyLoading, setPosterCopyLoading] = useState(false);
  const [posterProgress, setPosterProgress] = useState(0);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [historyItems, setHistoryItems] = useState<AiHistoryItem[]>(history);
  const [historyFilter, setHistoryFilter] = useState<"all" | "product_image" | "poster" | "copy">("all");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  function applyHistory(item: AiHistoryItem) {
    const payload = item.payload ?? {};
    if (item.type === "product_image") {
      const input = (payload.input as Record<string, string> | undefined) ?? {};
      const aspect = input.aspect === "16:9" || input.aspect === "9:16" || input.aspect === "1:1" ? input.aspect : "1:1";
      setImageForm({
        productName: input.productName ?? "",
        description: input.description ?? "",
        aspect,
      });
      if (item.imageUrl) setProductImage(item.imageUrl);
      return;
    }
    if (item.type === "poster") {
      const input = (payload.input as Record<string, string> | undefined) ?? {};
      setPosterForm((prev) => ({
        ...prev,
        productName: input.productName ?? prev.productName,
        description: input.description ?? prev.description,
        headline: input.headline ?? prev.headline,
        subheadline: input.subheadline ?? prev.subheadline,
        bullet1: input.bullet1 ?? prev.bullet1,
        bullet2: input.bullet2 ?? prev.bullet2,
        bullet3: input.bullet3 ?? prev.bullet3,
        priceLabel: input.priceLabel ?? prev.priceLabel,
        cta: input.cta ?? prev.cta,
        footer: input.footer ?? prev.footer,
        ratio: (input.ratio as PosterRatio | undefined) ?? prev.ratio,
        festival: (input.festival as FestivalMode | undefined) ?? prev.festival,
        objective: (input.objective as CampaignObjective | undefined) ?? prev.objective,
        designStyle: (input.designStyle as PosterDesignStyle | undefined) ?? prev.designStyle,
      }));
      if (item.imageUrl) {
        setPosterImage(item.imageUrl);
      }
      return;
    }
    const input = (payload.input as Record<string, string> | undefined) ?? {};
    const bundle = payload.bundle as CopyBundle | undefined;
    const posterFields = payload.posterFields as PosterCopyFields | undefined;
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
    if (posterFields) {
      setPosterForm((prev) => ({
        ...prev,
        productName: posterFields.title || prev.productName,
        headline: posterFields.title || prev.headline,
        subheadline: posterFields.subtitle || prev.subheadline,
        cta: posterFields.cta || prev.cta,
      }));
    }
  }

  function appendHistory(item: AiHistoryItem) {
    setHistoryItems((prev) => [item, ...prev].slice(0, 30));
  }

  function previewCopyText(item: AiHistoryItem) {
    const payload = item.payload ?? {};
    const bundle = payload.bundle as CopyBundle | undefined;
    const posterFields = payload.posterFields as PosterCopyFields | undefined;
    let joined = "";
    if (bundle) {
      const firstCaption = bundle.fbCaptions?.[0]?.text ?? "";
      const firstWa = bundle.whatsappBroadcasts?.[0] ?? "";
      const firstHook = bundle.hooks?.[0] ?? "";
      joined = [firstCaption, firstWa, firstHook].filter(Boolean).join(" | ");
    } else if (posterFields) {
      joined = [posterFields.title, posterFields.subtitle, posterFields.cta].filter(Boolean).join(" | ");
    }
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
        const outputSize =
          imageForm.aspect === "1:1"
            ? "1024x1024"
            : imageForm.aspect === "16:9"
              ? "1536x1024"
              : "1024x1536";
        const res = await fetch("/api/ai/enhance-product-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopId,
            originalImageUrl: uploadedImageUrl,
            productName: imageForm.productName,
            description: imageForm.description || undefined,
            style: theme === "minimal" ? "studio" : theme === "cute" ? "raya" : "premium",
            outputSize,
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
              aspect: imageForm.aspect,
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
              aspect: imageForm.aspect,
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
    if (!posterJobId) {
      setPosterError("Generate Copy with AI first.");
      return;
    }
    setPosterLoading(true);
    setPosterError(null);
    setPosterProgress(12);

    const tick = window.setInterval(() => {
      setPosterProgress((p) => (p < 88 ? p + 6 : p));
    }, 240);

    try {
      const bgRes = await fetch("/api/posters/v3/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: posterJobId }),
      });
      const bgJson = await bgRes.json();
      if (!bgRes.ok) throw new Error(bgJson.error ?? "Failed to generate background");
      if (bgJson.backgroundUrl) setPosterBackgroundUrl(String(bgJson.backgroundUrl));

      const renderRes = await fetch("/api/posters/v3/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: posterJobId,
          headline: posterForm.headline,
          subheadline: posterForm.subheadline,
          bullets: [posterForm.bullet1, posterForm.bullet2, posterForm.bullet3].filter(Boolean),
          cta: posterForm.cta,
          priceText: posterForm.priceLabel,
          footer: posterForm.footer,
        }),
      });
      const json = await renderRes.json();
      if (!renderRes.ok) throw new Error(json.error ?? "Failed");
      setPosterImage(String(json.finalPosterUrl));
      setPosterPreset((json.preset as PosterPresetName) ?? "");
      appendHistory({
        id: `tmp-poster-${Date.now()}`,
        type: "poster",
        createdAt: new Date().toISOString(),
        imageUrl: String(json.finalPosterUrl),
        payload: {
          input: {
            productName: posterForm.productName,
            description: posterForm.description,
            headline: posterForm.headline,
            subheadline: posterForm.subheadline,
            bullet1: posterForm.bullet1,
            bullet2: posterForm.bullet2,
            bullet3: posterForm.bullet3,
            priceLabel: posterForm.priceLabel,
            cta: posterForm.cta,
            footer: posterForm.footer,
            ratio: posterForm.ratio,
            festival: posterForm.festival,
            objective: posterForm.objective,
            designStyle: posterForm.designStyle,
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

  async function generatePosterCopyWithAi() {
    setPosterCopyLoading(true);
    setPosterError(null);
    try {
      const orderLink =
        shopProfile?.shopSlug && typeof window !== "undefined"
          ? `${window.location.origin}/s/${shopProfile.shopSlug}`
          : undefined;

      const res = await fetch("/api/posters/v3/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: posterJobId || undefined,
          shopId,
          productId: selectedProductId || undefined,
          productName: posterForm.productName || copyForm.productName,
          priceText: posterForm.priceLabel,
          description: posterForm.description || copyForm.keySellingPoints || undefined,
          festival: posterForm.festival,
          objective: posterForm.objective,
          style: posterForm.designStyle,
          ratio: posterForm.ratio,
          locale: copyLang,
          shopName: shopProfile?.shopName || undefined,
          whatsapp: shopProfile?.whatsapp || undefined,
          orderLink,
          footer: posterForm.footer || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      const copy = json.copy as {
        headline?: string;
        subheadline?: string;
        bullets?: string[];
        cta?: string;
        priceText?: string;
        footer?: string;
      };
      const fields: PosterCopyFields = {
        title: copy.headline,
        subtitle: copy.subheadline,
        bullets: copy.bullets ?? [],
        cta: copy.cta,
        priceText: copy.priceText,
        footer: copy.footer,
      };
      setPosterJobId(String(json.jobId));
      setPosterForm((s) => ({
        ...s,
        headline: fields.title || s.headline,
        subheadline: fields.subtitle || s.subheadline,
        bullet1: fields.bullets?.[0] || s.bullet1,
        bullet2: fields.bullets?.[1] || s.bullet2,
        bullet3: fields.bullets?.[2] || s.bullet3,
        cta: fields.cta || s.cta,
        priceLabel: fields.priceText || s.priceLabel,
        footer: fields.footer || s.footer,
      }));
      setCopyForm((s) => ({
        ...s,
        productName: s.productName || posterForm.productName,
        keySellingPoints: s.keySellingPoints || posterForm.description,
        price: formatMoney(posterForm.priceLabel.replace("MYR ", "")),
      }));
      appendHistory({
        id: `tmp-copy-poster-${Date.now()}`,
        type: "copy",
        createdAt: new Date().toISOString(),
        imageUrl: null,
        payload: {
          input: {
            mode: "poster_fields",
            productName: posterForm.productName,
            keySellingPoints: posterForm.description,
            priceText: posterForm.priceLabel,
            festival: posterForm.festival,
            objective: posterForm.objective,
            style: posterForm.designStyle,
            lang: copyLang,
          },
          posterFields: fields,
        },
      });
    } catch (error) {
      setPosterError(error instanceof Error ? error.message : "Failed");
    } finally {
      setPosterCopyLoading(false);
    }
  }

  async function regeneratePosterBackground() {
    if (!posterJobId) {
      setPosterError("Generate Copy with AI first.");
      return;
    }
    setPosterLoading(true);
    setPosterError(null);
    try {
      const bgRes = await fetch("/api/posters/v3/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: posterJobId, force: true }),
      });
      const bgJson = await bgRes.json();
      if (!bgRes.ok) throw new Error(bgJson.error ?? "Failed to regenerate background");
      if (bgJson.backgroundUrl) setPosterBackgroundUrl(String(bgJson.backgroundUrl));
    } catch (error) {
      setPosterError(error instanceof Error ? error.message : "Failed");
    } finally {
      setPosterLoading(false);
    }
  }

  async function shufflePosterTemplate() {
    if (!posterJobId) {
      setPosterError("Generate Copy + Poster first.");
      return;
    }
    setPosterLoading(true);
    setPosterError(null);
    try {
      const res = await fetch("/api/posters/v3/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: posterJobId,
          headline: posterForm.headline,
          subheadline: posterForm.subheadline,
          bullets: [posterForm.bullet1, posterForm.bullet2, posterForm.bullet3].filter(Boolean),
          cta: posterForm.cta,
          priceText: posterForm.priceLabel,
          footer: posterForm.footer,
          shuffleTemplate: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to shuffle template");
      setPosterImage(String(json.finalPosterUrl));
      setPosterPreset((json.preset as PosterPresetName) ?? "");
    } catch (error) {
      setPosterError(error instanceof Error ? error.message : "Failed");
    } finally {
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
            <select
              value={imageForm.aspect}
              onChange={(e) => setImageForm((s) => ({ ...s, aspect: e.target.value as "1:1" | "16:9" | "9:16" }))}
              className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
            >
              <option value="1:1">1:1</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
            <div className="rounded-xl border border-white/10 bg-[#0B241F] p-3">
              <p className="text-xs text-white/60">{t(lang, "ai.photo_upload_label")}</p>
              <ImageUploader uploading={imageLoading} onChange={uploadAiImage} previewUrl={uploadedImageUrl || undefined} label={t(lang, "ai.photo_upload_cta")} />
              <p className="mt-2 text-xs text-white/45">{t(lang, "ai.photo_upload_hint")}</p>
            </div>
            <Button variant="ai" onClick={generateProductImage} disabled={imageLoading || !imageForm.productName} className="animate-pulse">
              {imageLoading
                ? t(lang, "ai.generating")
                : uploadedImageUrl
                  ? `${t(lang, "ai.enhance_photo_cta").replace("(1 image credit)", "")} (${creditCosts.product_image} credits)`
                  : `${t(lang, "ai.generate_bg_cta").replace("(1 image credit)", "")} (${creditCosts.product_image} credits)`}
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
            <p className="text-xs text-white/55">{t(lang, "ai.poster_v3_hint")}</p>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedProductId(id);
                  const found = products.find((p) => p.id === id);
                  if (found) {
                    const price = found.price_cents ? (found.price_cents / 100).toFixed(2) : "0.00";
                    setPosterForm((s) => ({
                      ...s,
                      productName: found.name,
                      description: found.description?.trim() ? found.description.slice(0, 140) : s.description,
                      headline: s.headline || found.name,
                      priceLabel: `MYR ${price}`,
                    }));
                    setCopyForm((s) => ({
                      ...s,
                      productName: found.name,
                      keySellingPoints: found.description?.trim() ? found.description.slice(0, 180) : s.keySellingPoints,
                      price,
                    }));
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
                    description: copyForm.keySellingPoints || s.description,
                    headline: s.headline || copyForm.productName || s.productName,
                    priceLabel: `MYR ${formatMoney(copyForm.price)}`,
                  }));
                }}
              >
                {t(lang, "ai.use_copy_data")}
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <select
                value={posterForm.festival}
                onChange={(e) => setPosterForm((s) => ({ ...s, festival: e.target.value as FestivalMode }))}
                className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
              >
                <option value="generic">{t(lang, "ai.festival.generic")}</option>
                <option value="ramadan">{t(lang, "ai.festival.ramadan")}</option>
                <option value="raya">{t(lang, "ai.festival.raya")}</option>
                <option value="cny">{t(lang, "ai.festival.cny")}</option>
                <option value="deepavali">{t(lang, "ai.festival.deepavali")}</option>
                <option value="christmas">{t(lang, "ai.festival.christmas")}</option>
                <option value="valentine">{t(lang, "ai.festival.valentine")}</option>
                <option value="birthday">{t(lang, "ai.festival.birthday")}</option>
                <option value="none">{t(lang, "ai.festival.none")}</option>
              </select>
              <select
                value={posterForm.objective}
                onChange={(e) => setPosterForm((s) => ({ ...s, objective: e.target.value as CampaignObjective }))}
                className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
              >
                <option value="flash_sale">{t(lang, "ai.objective.flash_sale")}</option>
                <option value="new_launch">{t(lang, "ai.objective.new_launch")}</option>
                <option value="preorder">{t(lang, "ai.objective.preorder")}</option>
                <option value="limited">{t(lang, "ai.objective.limited")}</option>
                <option value="bundle">{t(lang, "ai.objective.bundle")}</option>
                <option value="free_delivery">{t(lang, "ai.objective.free_delivery")}</option>
                <option value="whatsapp">{t(lang, "ai.objective.whatsapp")}</option>
              </select>
              <select
                value={posterForm.designStyle}
                onChange={(e) => setPosterForm((s) => ({ ...s, designStyle: e.target.value as PosterDesignStyle }))}
                className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
              >
                <option value="premium">{t(lang, "ai.style.premium")}</option>
                <option value="festive">{t(lang, "ai.style.festive")}</option>
                <option value="minimal">{t(lang, "ai.style.minimal")}</option>
                <option value="retail">{t(lang, "ai.style.retail")}</option>
                <option value="cute">{t(lang, "ai.style.cute")}</option>
              </select>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Button
                type="button"
                variant="outline"
                onClick={generatePosterCopyWithAi}
                disabled={posterCopyLoading || !(posterForm.productName || copyForm.productName)}
              >
                {posterCopyLoading ? t(lang, "ai.generating") : t(lang, "ai.poster_generate_copy")}
              </Button>
              <Button type="button" variant="outline" onClick={generatePosterCopyWithAi} disabled={posterCopyLoading || !(posterForm.productName || copyForm.productName)}>
                {t(lang, "ai.poster_regen_copy")}
              </Button>
            </div>
            <Input placeholder={t(lang, "ai.poster_product_placeholder")} value={posterForm.productName} onChange={(e) => setPosterForm((s) => ({ ...s, productName: e.target.value }))} />
            <Input placeholder={t(lang, "ai.poster_desc_oneline")} value={posterForm.description} onChange={(e) => setPosterForm((s) => ({ ...s, description: e.target.value }))} />
            <Input placeholder={t(lang, "ai.poster_headline")} value={posterForm.headline} onChange={(e) => setPosterForm((s) => ({ ...s, headline: e.target.value }))} />
            <Input placeholder={t(lang, "ai.poster_subheadline")} value={posterForm.subheadline} onChange={(e) => setPosterForm((s) => ({ ...s, subheadline: e.target.value }))} />
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder={t(lang, "ai.poster_bullet1")} value={posterForm.bullet1} onChange={(e) => setPosterForm((s) => ({ ...s, bullet1: e.target.value }))} />
              <Input placeholder={t(lang, "ai.poster_bullet2")} value={posterForm.bullet2} onChange={(e) => setPosterForm((s) => ({ ...s, bullet2: e.target.value }))} />
              <Input placeholder={t(lang, "ai.poster_bullet3")} value={posterForm.bullet3} onChange={(e) => setPosterForm((s) => ({ ...s, bullet3: e.target.value }))} />
            </div>
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
            <Input placeholder={t(lang, "ai.poster_footer_optional")} value={posterForm.footer} onChange={(e) => setPosterForm((s) => ({ ...s, footer: e.target.value }))} />
            <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <select
                value={posterForm.ratio}
                onChange={(e) => setPosterForm((s) => ({ ...s, ratio: e.target.value as PosterRatio }))}
                className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
              >
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="4:5">4:5</option>
              </select>
              <Button type="button" variant="outline" onClick={regeneratePosterBackground} disabled={posterLoading || !posterJobId}>
                {t(lang, "ai.poster_regen_bg")}
              </Button>
              <Button type="button" variant="outline" onClick={shufflePosterTemplate} disabled={posterLoading || !posterJobId}>
                {t(lang, "ai.poster_shuffle")}
              </Button>
            </div>
            <select
              value={copyLang}
              onChange={(e) => setCopyLang(e.target.value as Lang)}
              className="h-10 rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]"
            >
              <option value="en">English</option>
              <option value="ms">Bahasa Melayu</option>
              <option value="zh">中文</option>
            </select>
            <div className="rounded-xl border border-white/10 bg-[#163C33]/40 p-3 text-xs text-white/65">
              <p>{t(lang, "ai.poster_brand_block")}</p>
              <p>{t(lang, "ai.poster_shop")}: {shopProfile?.shopName || "-"}</p>
              <p>{t(lang, "ai.poster_whatsapp")}: {shopProfile?.whatsapp || "-"}</p>
              <p>{t(lang, "ai.poster_link")}: {shopProfile?.shopSlug ? `/s/${shopProfile.shopSlug}` : "-"}</p>
              {posterJobId ? <p className="mt-1 text-[#00C2A8]">{t(lang, "ai.poster_job")}: {posterJobId.slice(0, 8)}...</p> : null}
              {posterPreset ? <p className="text-[#00C2A8]">{t(lang, "ai.poster_preset")}: {posterPreset}</p> : null}
            </div>
            <Button variant="ai" onClick={generatePoster} disabled={posterLoading || !posterForm.headline || !posterJobId} className="animate-pulse">
              {posterLoading ? t(lang, "ai.rendering") : t(lang, "ai.poster_generate_final")}
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
          <span className={aiBadgeClass}>{t(lang, "ai.cost_label")} {creditCosts.copy}</span>
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
            {copyLoading ? t(lang, "ai.generating") : `${t(lang, "ai.generate_copy_cta").replace("(1 copy credit)", "")} (${creditCosts.copy} credits)`}
          </Button>
        </div>

        {copyLoading && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <LoadingBlock label={t(lang, "ai.copy_fb_caps")} />
            <LoadingBlock label={t(lang, "ai.copy_wa_hooks")} />
          </div>
        )}

        {copyBundle && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p className="text-xs font-semibold uppercase text-[#9CA3AF]">{t(lang, "ai.copy_fb_caps")}</p>
              <ul className="mt-2 space-y-2 text-sm text-[#F3F4F6]">
                {copyBundle.fbCaptions.map((c) => (
                  <li key={`${c.tone}-${c.text.slice(0, 12)}`}>
                    <span className="font-semibold uppercase text-[#C9A227]">[{c.tone}]</span> {c.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p className="text-xs font-semibold uppercase text-[#9CA3AF]">{t(lang, "ai.copy_whatsapp")}</p>
              <ul className="mt-2 space-y-2 text-sm text-[#F3F4F6]">
                {copyBundle.whatsappBroadcasts.map((s, i) => (
                  <li key={`${i}-${s.slice(0, 10)}`}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#163C33] p-3">
              <p className="text-xs font-semibold uppercase text-[#9CA3AF]">{t(lang, "ai.copy_hooks")}</p>
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
          <h3 className="text-lg font-semibold text-[#F3F4F6]">{t(lang, "ai.history_title")}</h3>
          <span className="text-xs text-white/60">{historyItems.length} {t(lang, "ai.history_saved")}</span>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value as "all" | "product_image" | "poster" | "copy")}
            className="h-9 rounded-lg border border-white/10 bg-[#163C33] px-3 text-xs text-[#F3F4F6]"
          >
            <option value="all">{t(lang, "ai.history_all_types")}</option>
            <option value="product_image">{t(lang, "ai.history_bg")}</option>
            <option value="poster">{t(lang, "ai.history_poster")}</option>
            <option value="copy">{t(lang, "ai.history_copy")}</option>
          </select>
          <Button type="button" variant="outline" disabled={historyBusy} onClick={clearOldHistory}>
            {historyBusy ? t(lang, "ai.history_cleaning") : t(lang, "ai.history_clear_30d")}
          </Button>
        </div>
        {historyItems.filter((item) => historyFilter === "all" || item.type === historyFilter).length === 0 ? (
          <p className="text-sm text-white/60">{t(lang, "ai.history_empty")}</p>
        ) : (
          <div className="grid gap-3">
            {historyItems
              .filter((item) => historyFilter === "all" || item.type === historyFilter)
              .map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-[#163C33]/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {item.type === "product_image" ? t(lang, "ai.history_bg") : item.type === "poster" ? t(lang, "ai.history_poster") : t(lang, "ai.history_copy_bundle")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/50">{formatDateTimeMY(item.createdAt)}</p>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={historyBusy}
                      onClick={() => deleteHistoryItem(item.id)}
                    >
                      {t(lang, "ai.delete")}
                    </Button>
                  </div>
                </div>
                {item.type === "copy" ? (
                  (() => {
                    const preview = previewCopyText(item);
                    if (!preview) {
                      return <p className="mt-2 text-xs text-white/50">{t(lang, "ai.history_no_preview")}</p>;
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
                            {preview.expanded ? t(lang, "ai.show_less") : t(lang, "ai.show_more")}
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
                      {t(lang, "ai.download")}
                    </a>
                  </div>
                ) : null}
                <div className="mt-2">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => applyHistory(item)}>
                      {t(lang, "ai.reuse")}
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
