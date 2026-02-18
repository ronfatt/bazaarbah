"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currencyFromCents } from "@/lib/utils";
import type { Product, Shop } from "@/types";

type Props = {
  shops: Shop[];
  products: Product[];
};

export function ProductManager({ shops, products }: Props) {
  const [shopId, setShopId] = useState(shops[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("29.90");
  const [status, setStatus] = useState<string | null>(null);

  const grouped = useMemo(() => products.filter((p) => !shopId || p.shop_id === shopId), [products, shopId]);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving...");

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId,
        name,
        description,
        priceCents: Math.round(Number(price) * 100),
      }),
    });

    const json = await res.json();
    setStatus(res.ok ? "Saved." : json.error ?? "Failed");
    if (res.ok) window.location.reload();
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
        <h2 className="text-lg font-semibold text-[#F3F4F6]">Add Product</h2>
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6]" required>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.shop_name}
            </option>
          ))}
        </select>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product Name" required />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29.90" required />
        <Button type="submit">Create Product</Button>
        {status && <p className="text-sm text-[#9CA3AF]">{status}</p>}
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#112E27]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/5 bg-[#163C33] text-[#9CA3AF]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((p) => (
              <tr key={p.id} className="border-t border-white/5 text-[#F3F4F6] hover:bg-[#163C33]">
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
                <td colSpan={4} className="px-4 py-8 text-center text-[#9CA3AF]">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
