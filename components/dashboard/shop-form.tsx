"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Shop } from "@/types";

type Props = { initialShop: Shop | null };

export function ShopForm({ initialShop }: Props) {
  const [shopName, setShopName] = useState(initialShop?.shop_name ?? "");
  const [slug, setSlug] = useState(initialShop?.slug ?? "");
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(initialShop?.phone_whatsapp ?? "");
  const [addressText, setAddressText] = useState(initialShop?.address_text ?? "");
  const [theme, setTheme] = useState<"gold" | "minimal" | "cute">(initialShop?.theme ?? "gold");
  const [logoUrl, setLogoUrl] = useState(initialShop?.logo_url ?? "");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving...");

    const method = initialShop ? "PATCH" : "POST";
    const body = initialShop
      ? { shopId: initialShop.id, shopName, slug, phoneWhatsapp, addressText: addressText || null, theme, logoUrl: logoUrl || null }
      : { shopName, slug, phoneWhatsapp, addressText, theme, logoUrl };

    const res = await fetch("/api/shops", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setStatus(res.ok ? "Saved." : json.error ?? "Failed");
    if (res.ok && !initialShop) {
      window.location.reload();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Shop Name" required />
      <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" required />
      <Input value={phoneWhatsapp} onChange={(e) => setPhoneWhatsapp(e.target.value)} placeholder="WhatsApp Number" required />
      <Textarea value={addressText} onChange={(e) => setAddressText(e.target.value)} placeholder="Address (optional)" rows={2} />
      <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL (optional)" />
      <select value={theme} onChange={(e) => setTheme(e.target.value as "gold" | "minimal" | "cute")} className="h-10 w-full rounded-xl border border-neutral-300 px-3 text-sm">
        <option value="gold">gold</option>
        <option value="minimal">minimal</option>
        <option value="cute">cute</option>
      </select>
      <Button type="submit">{initialShop ? "Update Shop" : "Create Shop"}</Button>
      {status && <p className="text-sm text-neutral-600">{status}</p>}
    </form>
  );
}
