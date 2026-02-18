"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { t, type Lang } from "@/lib/i18n";
import type { Shop } from "@/types";

type Props = { initialShop: Shop | null };

export function ShopForm({ initialShop, lang = "en" }: Props & { lang?: Lang }) {
  const [shopName, setShopName] = useState(initialShop?.shop_name ?? "");
  const [slug, setSlug] = useState(initialShop?.slug ?? "");
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(initialShop?.phone_whatsapp ?? "");
  const [addressText, setAddressText] = useState(initialShop?.address_text ?? "");
  const [theme, setTheme] = useState<"gold" | "minimal" | "cute">(initialShop?.theme ?? "gold");
  const [logoUrl, setLogoUrl] = useState(initialShop?.logo_url ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://bazaarbah.com";
  const normalizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("...");

    const method = initialShop ? "PATCH" : "POST";
    const body = initialShop
      ? { shopId: initialShop.id, shopName, slug, phoneWhatsapp, addressText: addressText || null, theme, logoUrl: logoUrl || null }
      : { shopName, slug, phoneWhatsapp, addressText, theme, logoUrl: logoUrl || undefined };

    const res = await fetch("/api/shops", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setStatus(res.ok ? "OK" : json.error ?? "Failed");
    if (res.ok) window.location.href = "/dashboard/products";
  }

  async function onLogoFileChange(file?: File) {
    if (!file) return;
    setUploadingLogo(true);
    setStatus(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/shops/logo", { method: "POST", body: form });
    const json = await res.json();
    setUploadingLogo(false);
    if (!res.ok) {
      setStatus(json.error ?? "Logo upload failed");
      return;
    }
    setLogoUrl(json.logoUrl);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-semibold text-white">{t(lang, "shop.field.name.label")}</label>
        <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ain's Raya Cookies" required />
        <p className="mt-1 text-xs text-white/45">{t(lang, "shop.field.name.helper")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white">{t(lang, "shop.field.slug.label")}</label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ains-raya" required />
        <p className="mt-1 text-xs text-white/45">{t(lang, "shop.field.slug.helper")}</p>
        <p className="mt-2 text-xs text-white/70">
          {t(lang, "shop.field.slug.preview")} <span className="font-mono text-bb-gold">{baseUrl}/s/{normalizedSlug || "your-shop-link"}</span>
        </p>
        <p className="mt-1 text-xs text-white/45">{t(lang, "shop.field.slug.note")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white">{t(lang, "shop.field.whatsapp.label")}</label>
        <Input value={phoneWhatsapp} onChange={(e) => setPhoneWhatsapp(e.target.value)} placeholder="6012XXXXXXX" required />
        <p className="mt-1 text-xs text-white/45">{t(lang, "shop.field.whatsapp.helper")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white">{t(lang, "shop.field.area.label")}</label>
        <Textarea value={addressText} onChange={(e) => setAddressText(e.target.value)} placeholder="Tawau town area" rows={2} />
        <p className="mt-1 text-xs text-white/45">{t(lang, "shop.field.area.helper")}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white">{t(lang, "shop.field.logo.label")}</label>
        <p className="mb-2 text-xs text-white/45">{t(lang, "shop.field.logo.helper")}</p>
        <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/10 bg-[#163C33] px-4 py-2 text-sm text-white hover:bg-[#1c4a40]">
          {uploadingLogo ? t(lang, "shop.field.logo.uploading") : t(lang, "shop.field.logo.upload")}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onLogoFileChange(e.target.files?.[0])} />
        </label>
        {logoUrl && (
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Shop logo preview" className="h-14 w-14 rounded-lg border border-white/10 object-cover" />
            <p className="text-xs text-white/65">{t(lang, "shop.field.logo.done")}</p>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white">{t(lang, "shop.field.style.label")}</label>
        <p className="mb-2 text-xs text-white/45">{t(lang, "shop.field.style.helper")}</p>
        <div className="grid gap-2 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setTheme("gold")}
            className={`rounded-xl border p-3 text-left ${theme === "gold" ? "border-bb-gold bg-bb-gold/10" : "border-white/10 bg-[#163C33]"}`}
          >
            <div className="h-10 rounded-md bg-gradient-to-r from-[#0B3D2E] to-[#D4AF37]" />
            <p className="mt-2 text-sm font-semibold text-white">{t(lang, "shop.style.gold")}</p>
            <p className="text-xs text-white/45">{t(lang, "shop.style.gold.sub")}</p>
          </button>
          <button
            type="button"
            onClick={() => setTheme("minimal")}
            className={`rounded-xl border p-3 text-left ${theme === "minimal" ? "border-bb-ai bg-bb-ai/10" : "border-white/10 bg-[#163C33]"}`}
          >
            <div className="h-10 rounded-md bg-gradient-to-r from-[#f7f7f7] to-[#1f2937]" />
            <p className="mt-2 text-sm font-semibold text-white">{t(lang, "shop.style.minimal")}</p>
          </button>
          <button
            type="button"
            onClick={() => setTheme("cute")}
            className={`rounded-xl border p-3 text-left ${theme === "cute" ? "border-pink-300 bg-pink-500/10" : "border-white/10 bg-[#163C33]"}`}
          >
            <div className="h-10 rounded-md bg-gradient-to-r from-[#FFFBEB] to-[#FB7185]" />
            <p className="mt-2 text-sm font-semibold text-white">{t(lang, "shop.style.cute")}</p>
          </button>
        </div>
      </div>

      <Button type="submit">{t(lang, "shop.save_continue")}</Button>
      <p className="text-xs text-white/45">{t(lang, "shop.next_product")}</p>
      {status && <p className="text-sm text-[#9CA3AF]">{status}</p>}
    </form>
  );
}
