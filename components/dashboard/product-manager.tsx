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
import Link from "next/link";

type Props = {
  shops: Shop[];
  products: Product[];
  aiCredits: number;
  imageCreditCost: number;
  readOnly?: boolean;
};

type EnhanceStyle = "studio" | "raya" | "premium";

function activeImage(product: Product) {
  const source = product.image_source ?? "original";
  if (source === "enhanced" && product.image_enhanced_url) return product.image_enhanced_url;
  return product.image_original_url ?? product.image_url ?? product.image_enhanced_url ?? null;
}

export function ProductManager({ shops, products, aiCredits: initialAiCredits, imageCreditCost, readOnly = false, lang = "en" }: Props & { lang?: Lang }) {
  const [shopId, setShopId] = useState(shops[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0.00");
  const [trackStock, setTrackStock] = useState(false);
  const [stockQty, setStockQty] = useState("0");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageOriginalUrl, setImageOriginalUrl] = useState("");
  const [imageEnhancedUrl, setImageEnhancedUrl] = useState("");
  const [imageSource, setImageSource] = useState<"original" | "enhanced">("original");
  const [enhanceStyle, setEnhanceStyle] = useState<EnhanceStyle>("studio");
  const [aiCredits, setAiCredits] = useState(initialAiCredits);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enhancingImage, setEnhancingImage] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("0.00");
  const [editTrackStock, setEditTrackStock] = useState(false);
  const [editStockQty, setEditStockQty] = useState("0");
  const [editSoldOut, setEditSoldOut] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
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
    if (readOnly) {
      setStatus("Free plan is read-only. Upgrade in Billing to add products.");
      return;
    }
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
        trackStock,
        stockQty: trackStock ? Math.max(0, Number(stockQty || 0)) : 0,
        soldOut: trackStock ? Number(stockQty || 0) <= 0 : false,
      }),
    });

    const json = await res.json();
    setStatus(res.ok ? "OK" : json.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  async function onProductImageChange(file?: File) {
    if (readOnly) return;
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
    if (readOnly) return;
    if (!imageOriginalUrl) {
      setStatus("Upload product photo first.");
      return;
    }
    if (aiCredits < imageCreditCost) {
      setStatus("Not enough AI credits. Upgrade in Billing.");
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
        setAiCredits(0);
        setStatus("You have 0 AI credits. Upgrade or top-up in Billing.");
      } else {
        setStatus(json.error ?? "AI enhancement failed");
      }
      return;
    }

    setImageEnhancedUrl(json.imageEnhancedUrl);
    setAiCredits(Number(json.remainingAiCredits ?? aiCredits));
    setStatus(`Enhanced photo ready. AI credits left: ${json.remainingAiCredits ?? "-"}`);
  }

  async function generateDescription() {
    if (readOnly) return;
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
    setStatus(`AI description ready. AI credits left: ${json.credits?.remaining ?? "-"}`);
  }

  async function toggleAvailability(productId: string, next: boolean) {
    if (readOnly) return;
    await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    });
    window.location.reload();
  }

  async function setMainSource(product: Product, source: "original" | "enhanced") {
    if (readOnly) return;
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageSource: source }),
    });
    window.location.reload();
  }

  async function remove(productId: string) {
    if (readOnly) return;
    await fetch(`/api/products/${productId}`, { method: "DELETE" });
    window.location.reload();
  }

  function startEdit(product: Product) {
    if (readOnly) return;
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice((product.price_cents / 100).toFixed(2));
    setEditTrackStock(Boolean(product.track_stock));
    setEditStockQty(String(product.stock_qty ?? 0));
    setEditSoldOut(Boolean(product.sold_out));
    setStatus(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPrice("0.00");
    setEditTrackStock(false);
    setEditStockQty("0");
    setEditSoldOut(false);
  }

  async function saveEdit(productId: string) {
    if (readOnly) return;
    const trimmedName = editName.trim();
    const parsedPrice = Number(editPrice);
    const parsedStockQty = Number(editStockQty);
    if (trimmedName.length < 2) {
      setStatus("Product name must be at least 2 characters.");
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setStatus("Price must be a valid number.");
      return;
    }
    if (Number.isNaN(parsedStockQty) || parsedStockQty < 0) {
      setStatus("Stock qty must be 0 or above.");
      return;
    }

    setSavingEdit(true);
    setStatus(null);
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmedName,
        priceCents: Math.round(parsedPrice * 100),
        trackStock: editTrackStock,
        stockQty: editTrackStock ? Math.round(parsedStockQty) : 0,
        soldOut: editTrackStock ? editSoldOut || Math.round(parsedStockQty) <= 0 : false,
      }),
    });
    const json = await res.json();
    setSavingEdit(false);
    if (!res.ok) {
      setStatus(json.error ?? "Failed to save product.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createProduct} className="space-y-4 rounded-2xl border border-white/5 bg-[#112E27] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[#F3F4F6]">{t(lang, "dashboard.add_product")}</h2>
        {readOnly ? (
          <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Free plan is view-only for products. <Link href="/dashboard/billing" className="underline">Upgrade in Billing</Link>.
          </div>
        ) : null}
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]" required disabled={readOnly}>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.shop_name}
            </option>
          ))}
        </select>

        <div className="space-y-2">
          <p className="text-xs text-white/60">Product Photo</p>
          {readOnly ? (
            <p className="rounded-xl border border-white/10 bg-[#163C33] px-3 py-2 text-xs text-white/60">Upload disabled on Free plan.</p>
          ) : (
            <ImageUploader uploading={uploadingImage} onChange={onProductImageChange} previewUrl={imageOriginalUrl || undefined} label="Upload Image" />
          )}
        </div>

        {imageOriginalUrl && !readOnly ? (
          <AIEnhancePanel
            imageOriginalUrl={imageOriginalUrl}
            imageEnhancedUrl={imageEnhancedUrl}
            imageSource={imageSource}
            imageCredits={aiCredits}
            style={enhanceStyle}
            generating={enhancingImage}
            status={status}
            costPerEnhance={imageCreditCost}
            onStyleChange={setEnhanceStyle}
            onEnhance={enhanceImage}
            onUseSource={setImageSource}
          />
        ) : null}

        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(lang, "products.title")} required disabled={readOnly} />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/60">Description</p>
            <Button type="button" variant="ai" onClick={generateDescription} disabled={readOnly || generatingDesc || !name.trim()}>
              {generatingDesc ? "Generating..." : "AI Generate Description"}
            </Button>
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short product description" rows={3} disabled={readOnly} />
        </div>
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
          onBlur={() => setPrice((prev) => Number(prev || 0).toFixed(2))}
          placeholder="0.00"
          required
          disabled={readOnly}
        />
        <div className="rounded-xl border border-white/10 bg-[#163C33]/50 p-3">
          <label className="flex items-center gap-2 text-sm text-white">
            <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} disabled={readOnly} />
            Track stock
          </label>
          <Input
            value={stockQty}
            onChange={(e) => setStockQty(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
            disabled={readOnly || !trackStock}
            className="mt-2"
          />
        </div>

        {imageEnhancedUrl ? (
          <div className="rounded-xl border border-white/10 bg-[#163C33]/60 p-3">
            <p className="text-xs text-white/60">Main photo source</p>
            <div className="mt-2 flex gap-2">
              <Button type="button" variant={imageSource === "original" ? "default" : "outline"} onClick={() => setImageSource("original")} disabled={readOnly}>Original</Button>
              <Button type="button" variant={imageSource === "enhanced" ? "default" : "outline"} onClick={() => setImageSource("enhanced")} disabled={readOnly}>Enhanced</Button>
            </div>
          </div>
        ) : null}

        <Button type="submit" disabled={readOnly || uploadingImage || generatingDesc || enhancingImage}>
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
              <th className="px-4 py-3">Stock</th>
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
                <td className="px-4 py-3">
                  {editingId === p.id ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" />
                  ) : (
                    p.name
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === p.id ? (
                    <Input
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      onBlur={() => setEditPrice((prev) => Number(prev || 0).toFixed(2))}
                      className="h-9 w-28"
                    />
                  ) : (
                    currencyFromCents(p.price_cents)
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-white/70">
                  {editingId === p.id ? (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editTrackStock} onChange={(e) => setEditTrackStock(e.target.checked)} />
                        <span>Track</span>
                      </label>
                      <Input
                        value={editStockQty}
                        onChange={(e) => setEditStockQty(e.target.value.replace(/[^0-9]/g, ""))}
                        className="h-9 w-24"
                        disabled={!editTrackStock}
                      />
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editSoldOut} onChange={(e) => setEditSoldOut(e.target.checked)} disabled={!editTrackStock} />
                        <span>Sold out</span>
                      </label>
                    </div>
                  ) : p.track_stock ? (
                    <>
                      <p>Qty {p.stock_qty ?? 0}</p>
                      <p>{p.sold_out ? "Sold out" : "In stock"}</p>
                    </>
                  ) : (
                    <p>Not tracked</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70">{p.image_source === "enhanced" ? "Enhanced" : "Original"}</span>
                  {p.image_enhanced_url ? (
                    <div className="mt-2">
                      <Button variant="outline" onClick={() => setMainSource(p, p.image_source === "enhanced" ? "original" : "enhanced")} disabled={readOnly}>
                        {p.image_source === "enhanced" ? "Use Original" : "Use Enhanced"}
                      </Button>
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" onClick={() => toggleAvailability(p.id, !p.is_available)} disabled={readOnly}>
                    {p.is_available ? "Yes" : "No"}
                  </Button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {editingId === p.id ? (
                      <>
                        <Button onClick={() => saveEdit(p.id)} disabled={readOnly || savingEdit}>
                          {savingEdit ? "Saving..." : "Save"}
                        </Button>
                        <Button variant="outline" onClick={cancelEdit} disabled={readOnly || savingEdit}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" onClick={() => startEdit(p)} disabled={readOnly}>
                        Edit
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => remove(p.id)} disabled={readOnly || (savingEdit && editingId === p.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#9CA3AF]">
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
