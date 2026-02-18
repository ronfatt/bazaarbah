import { ProductManager } from "@/components/dashboard/product-manager";
import { requireUnlockedSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import type { Product, Shop } from "@/types";

export default async function ProductsPage() {
  const { user } = await requireUnlockedSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("*").eq("owner_id", user.id).order("created_at", { ascending: true });
  const shopIds = shops?.map((s) => s.id) ?? [];

  const { data: products } = shopIds.length
    ? await admin.from("products").select("*").in("shop_id", shopIds).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold text-[#F3F4F6]">Products</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">CRUD products and availability.</p>
      </Card>
      <ProductManager shops={(shops ?? []) as Shop[]} products={(products ?? []) as Product[]} />
    </section>
  );
}
