"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currencyFromCents } from "@/lib/utils";
import type { Product, Shop } from "@/types";
import { t, type Lang } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/ui/image-uploader";
import { AIEnhancePanel } from "@/components/ui/ai-enhance-panel";

type Props = {
  shops: Shop[];
  products: Product[];
  imageCredits: number;
};

type EnhanceStyle = "studio" | "raya" | "premium";

function activeImage(product: Product) {
  const source = product.image_source ?? "original";
  if (source === "enhanced" && product.image_enhanced_url) return product.image_enhanced_url;
  return product.image_original_url ?? product.image_url ?? product.image_enhanced_url ?? null;
}

export function ProductManager({ shops, products, imageCredits: initialImageCredits, lang = "en" }: Props & { lang?: Lang }) {
  const [shopId, setShopId] = useState(shops[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("29.90");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageOriginalUrl, setImageOriginalUrl] = useState("");
  const [imageEnhancedUrl, setImageEnhancedUrl] = useState("");
  const [imageSource, setImageSource] = useState<"original" | "enhanced">("original");
  const [enhanceStyle, setEnhanceStyle] = useState<EnhanceStyle>("studio");
  const [imageCredits, setImageCredits] = useState(initialImageCredits);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enhancingImage, setEnhancingImage] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const grouped = useMemo(() => products.filter((p) => !shopId || p.shop_id === shopId), [products, shopId]);

  async function uploadProductImage(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/products/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Upload failed");
    }
    return json.imageUrl as string;
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setStatus("...");
    let finalOriginalUrl = imageOriginalUrl;

    if (!finalOriginalUrl && imageFile) {
      try {
        setUploadingImage(true);
        finalOriginalUrl = await uploadProductImage(imageFile);
        setImageOriginalUrl(finalOriginalUrl);
      } catch (error) {
        setUploadingImage(false);
        setStatus(error instanceof Error ? error.message : "Upload failed");
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId,
        name,
        description,
        priceCents: Math.round(Number(price) * 100),
        imageOriginalUrl: finalOriginalUrl || undefined,
        imageEnhancedUrl: imageEnhancedUrl || undefined,
        imageSource,
      }),
    });

    const json = await res.json();
    setStatus(res.ok ? "OK" : json.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  async function onProductImageChange(file?: File) {
    if (!file) return;
    setImageFile(file);
    setUploadingImage(true);
    setStatus(null);
    try {
      const uploadedUrl = await uploadProductImage(file);
      setImageOriginalUrl(uploadedUrl);
      setImageEnhancedUrl("");
      setImageSource("original");
      setStatus("Image uploaded and ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
      return;
    } finally {
      setUploadingImage(false);
    }
  }

  async function enhanceImage() {
    if (!imageOriginalUrl) {
      setStatus("Upload product photo first.");
      return;
    }
    if (imageCredits < 1) {
      setStatus("Not enough image credits. Upgrade in Billing.");
      return;
    }
    setEnhancingImage(true);
    setStatus(null);

    const res = await fetch("/api/ai/enhance-product-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId,
        originalImageUrl: imageOriginalUrl,
        productName: name || "Raya Product",
        description: description || undefined,
        style: enhanceStyle,
        outputSize: "1024x1024",
      }),
    });

    const json = await res.json();
    setEnhancingImage(false);

    if (!res.ok) {
      if (json.error === "INSUFFICIENT_CREDITS") {
        setImageCredits(0);
        setStatus("You have 0 image credits. Upgrade or top-up in Billing.");
      } else {
        setStatus(json.error ?? "AI enhancement failed");
      }
      return;
    }

    setImageEnhancedUrl(json.imageEnhancedUrl);
    setImageCredits(Number(json.remainingImageCredits ?? imageCredits));
    setStatus(`Enhanced photo ready. Image credits left: ${json.remainingImageCredits ?? "-"}`);
  }

  async function generateDescription() {
    if (!name.trim()) {
      setStatus("Enter product name first.");
      return;
    }
    setGeneratingDesc(true);
    setStatus(null);
    const res = await fetch("/api/ai/product-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: name,
        price,
        keySellingPoints: description,
        shopId: shopId || undefined,
        lang,
      }),
    });
    const json = await res.json();
    setGeneratingDesc(false);
    if (!res.ok) {
      setStatus(json.error ?? "AI generation failed");
      return;
    }
    setDescription(json.description);
    setStatus(`AI description ready. Copy credits left: ${json.credits?.remaining ?? "-"}`);
  }

  async function toggleAvailability(productId: string, next: boolean) {
    await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    });
    window.location.reload();
  }

  async function setMainSource(product: Product, source: "original" | "enhanced") {
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageSource: source }),
    });
    window.location.reload();
  }

  async function remove(productId: string) {
    await fetch(`/api/products/${productId}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createProduct} className="space-y-4 rounded-2xl border border-white/5 bg-[#112E27] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[#F3F4F6]">{t(lang, "dashboard.add_product")}</h2>
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]" required>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.shop_name}
            </option>
          ))}
        </select>

        <div className="space-y-2">
          <p className="text-xs text-white/60">Product Photo</p>
          <ImageUploader uploading={uploadingImage} onChange={onProductImageChange} previewUrl={imageOriginalUrl || undefined} label="Upload Image" />
        </div>

        {imageOriginalUrl ? (
          <AIEnhancePanel
            imageOriginalUrl={imageOriginalUrl}
            imageEnhancedUrl={imageEnhancedUrl}
            imageSource={imageSource}
            imageCredits={imageCredits}
            style={enhanceStyle}
            generating={enhancingImage}
            status={status}
            onStyleChange={setEnhanceStyle}
            onEnhance={enhanceImage}
            onUseSource={setImageSource}
          />
        ) : null}

        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(lang, "products.title")} required />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/60">Description</p>
            <Button type="button" variant="ai" onClick={generateDescription} disabled={generatingDesc || !name.trim()}>
              {generatingDesc ? "Generating..." : "AI Generate Description"}
            </Button>
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short product description" rows={3} />
        </div>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29.90" required />

        {imageEnhancedUrl ? (
          <div className="rounded-xl border border-white/10 bg-[#163C33]/60 p-3">
            <p className="text-xs text-white/60">Main photo source</p>
            <div className="mt-2 flex gap-2">
              <Button type="button" variant={imageSource === "original" ? "default" : "outline"} onClick={() => setImageSource("original")}>Original</Button>
              <Button type="button" variant={imageSource === "enhanced" ? "default" : "outline"} onClick={() => setImageSource("enhanced")}>Enhanced</Button>
            </div>
          </div>
        ) : null}

        <Button type="submit" disabled={uploadingImage || generatingDesc || enhancingImage}>
          {uploadingImage ? "Uploading image..." : t(lang, "dashboard.add_product")}
        </Button>
        {!imageOriginalUrl && status ? <p className="text-sm text-[#9CA3AF]">{status}</p> : null}
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#112E27]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 bg-[#163C33] text-[#9CA3AF]">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">{t(lang, "products.title")}</th>
              <th className="px-4 py-3">{t(lang, "orders.subtotal")}</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((p) => (
              <tr key={p.id} className="border-t border-white/5 text-[#F3F4F6] hover:bg-[#163C33]">
                <td className="px-4 py-3">
                  {activeImage(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeImage(p)!} alt={p.name} className="h-10 w-10 rounded-md border border-white/10 object-cover" />
                  ) : (
                    <span className="text-xs text-white/40">No image</span>
                  )}
                </td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{currencyFromCents(p.price_cents)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70">{p.image_source === "enhanced" ? "Enhanced" : "Original"}</span>
                  {p.image_enhanced_url ? (
                    <div className="mt-2">
                      <Button variant="outline" onClick={() => setMainSource(p, p.image_source === "enhanced" ? "original" : "enhanced")}>
                        {p.image_source === "enhanced" ? "Use Original" : "Use Enhanced"}
                      </Button>
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" onClick={() => toggleAvailability(p.id, !p.is_available)}>
                    {p.is_available ? "Yes" : "No"}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  <Button variant="danger" onClick={() => remove(p.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#9CA3AF]">
                  {t(lang, "orders.no_orders")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
