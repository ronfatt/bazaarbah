"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currencyFromCents } from "@/lib/utils";
import type { Product, Shop } from "@/types";
import { t, type Lang } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  shops: Shop[];
  products: Product[];
};

export function ProductManager({ shops, products, lang = "en" }: Props & { lang?: Lang }) {
  const [shopId, setShopId] = useState(shops[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("29.90");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const grouped = useMemo(() => products.filter((p) => !shopId || p.shop_id === shopId), [products, shopId]);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setStatus("...");

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId,
        name,
        description,
        priceCents: Math.round(Number(price) * 100),
        imageUrl: imageUrl || undefined,
      }),
    });

    const json = await res.json();
    setStatus(res.ok ? "OK" : json.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  async function onProductImageChange(file?: File) {
    if (!file) return;
    setUploadingImage(true);
    setStatus(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/products/upload", { method: "POST", body: form });
    const json = await res.json();
    setUploadingImage(false);
    if (!res.ok) {
      setStatus(json.error ?? "Upload failed");
      return;
    }
    setImageUrl(json.imageUrl);
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

  async function remove(productId: string) {
    await fetch(`/api/products/${productId}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createProduct} className="space-y-3 rounded-2xl border border-white/5 bg-[#112E27] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[#F3F4F6]">{t(lang, "dashboard.add_product")}</h2>
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]" required>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.shop_name}
            </option>
          ))}
        </select>
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
        <div className="space-y-2">
          <p className="text-xs text-white/60">Product Image (optional)</p>
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/10 bg-[#163C33] px-4 py-2 text-sm text-white hover:bg-[#1c4a40]">
            {uploadingImage ? "Uploading..." : "Upload Image"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onProductImageChange(e.target.files?.[0])} />
          </label>
          {imageUrl && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Product preview" className="h-14 w-14 rounded-lg border border-white/10 object-cover" />
              <p className="text-xs text-white/65">Image uploaded</p>
            </div>
          )}
        </div>
        <Button type="submit">{t(lang, "dashboard.add_product")}</Button>
        {status && <p className="text-sm text-[#9CA3AF]">{status}</p>}
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#112E27]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 bg-[#163C33] text-[#9CA3AF]">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">{t(lang, "products.title")}</th>
              <th className="px-4 py-3">{t(lang, "orders.subtotal")}</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((p) => (
              <tr key={p.id} className="border-t border-white/5 text-[#F3F4F6] hover:bg-[#163C33]">
                <td className="px-4 py-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md border border-white/10 object-cover" />
                  ) : (
                    <span className="text-xs text-white/40">No image</span>
                  )}
                </td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{currencyFromCents(p.price_cents)}</td>
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
                <td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF]">
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
