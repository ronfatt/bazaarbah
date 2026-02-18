import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "@/components/buyer/checkout-form";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: shop } = await admin.from("shops").select("id,shop_name,slug,theme,is_active").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!shop) {
    notFound();
  }

  const { data: products } = await admin
    .from("products")
    .select("id,name,description,price_cents")
    .eq("shop_id", shop.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 md:px-10">
      <h1 className="text-4xl font-bold text-neutral-900">{shop.shop_name}</h1>
      <p className="mt-2 text-neutral-600">Raya pre-order shop. No account required.</p>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Products</h2>
          <div className="mt-3 space-y-3">
            {(products ?? []).map((p) => (
              <div key={p.id} className="rounded-xl border border-neutral-200 p-3">
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-neutral-600">{p.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <CheckoutForm shopSlug={shop.slug} products={(products ?? []).map((p) => ({ id: p.id, name: p.name, price_cents: p.price_cents }))} />
      </section>
    </main>
  );
}
