"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CreatedStore = {
  id: string;
  name: string;
  slug: string;
};

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export function OnboardingWizard() {
  const [ownerId, setOwnerId] = useState(() => {
    if (typeof window !== "undefined") {
      const existing = window.localStorage.getItem("raya_owner_id");
      if (existing) return existing;
    }
    return crypto.randomUUID();
  });

  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [brandColor, setBrandColor] = useState("#f7b801");

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [price, setPrice] = useState("39.90");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdStore, setCreatedStore] = useState<CreatedStore | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const shareUrl = useMemo(() => {
    if (!createdStore) return "";
    if (typeof window === "undefined") return `/s/${createdStore.slug}`;
    return `${window.location.origin}/s/${createdStore.slug}`;
  }, [createdStore]);

  async function onCreateStore() {
    setIsLoading(true);
    setError(null);

    try {
      const computedSlug = slug || toSlug(storeName);
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          name: storeName,
          slug: computedSlug,
          brandColor,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create store");

      setCreatedStore(json.store);
      setSlug(computedSlug);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("raya_owner_id", ownerId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Store creation failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function onCreateProduct() {
    if (!createdStore) return;

    setIsLoading(true);
    setError(null);

    try {
      const priceCents = Math.round(Number(price) * 100);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: createdStore.id,
          name: productName,
          description: productDescription,
          priceCents,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create product");

      setCreatedProductId(json.product.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product creation failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function onCopyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">10-Minute Store Setup</h2>
        <p className="font-mono text-xs text-neutral-500">Step-by-step</p>
      </div>

      {!createdStore && (
        <div className="mt-5 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Seller Owner ID</label>
          <Input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="Seller UUID" />
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Store Name</label>
          <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Kak Aina Kuih Raya" />
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Slug (optional)</label>
          <Input value={slug} onChange={(e) => setSlug(toSlug(e.target.value))} placeholder="kak-aina-kuih" />
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Brand Color</label>
          <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} placeholder="#f7b801" />

          <Button disabled={isLoading || !storeName || !ownerId} onClick={onCreateStore} className="mt-2">
            {isLoading ? "Creating Store..." : "Create Store"}
          </Button>
        </div>
      )}

      {createdStore && !createdProductId && (
        <div className="mt-5 space-y-3">
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Store ready: <span className="font-semibold">{createdStore.name}</span>
          </p>

          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">First Product</label>
          <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Kuih Bangkit Premium" />

          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Description</label>
          <Textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Melt-in-mouth festive cookies."
            rows={3}
          />

          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Price (MYR)</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="39.90" />

          <Button disabled={isLoading || !productName || Number(price) <= 0} onClick={onCreateProduct} className="mt-2">
            {isLoading ? "Saving Product..." : "Save First Product"}
          </Button>
        </div>
      )}

      {createdStore && createdProductId && (
        <div className="mt-5 space-y-4">
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Done. Your store is live and share-ready.
          </p>
          <Input readOnly value={shareUrl} />
          <div className="flex gap-3">
            <Button onClick={onCopyLink}>Copy Link</Button>
            <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex">
              <Button variant="outline">Open Store</Button>
            </a>
          </div>
          <p className="text-xs text-neutral-500">Next: use AI endpoints to generate promo copy and posters.</p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
