import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "@/components/buyer/checkout-form";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const lang = await getLangFromCookie();
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: shop } = await admin
    .from("shops")
    .select("id,shop_name,slug,theme,is_active,phone_whatsapp,address_text")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!shop) notFound();

  const { data: products } = await admin
    .from("products")
    .select("id,name,description,price_cents,image_url")
    .eq("shop_id", shop.id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-neutral-900">
      <header className="bg-[#0E3B2E] text-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <h1 className="text-3xl font-bold">{shop.shop_name}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/90">
            <span className="rounded-full bg-white/15 px-3 py-1">⭐ 4.8 rating</span>
            {shop.address_text ? <span className="rounded-full bg-white/15 px-3 py-1">📍 {shop.address_text}</span> : null}
            <span className="rounded-full bg-white/15 px-3 py-1">🚚 Delivery / Pickup</span>
            {shop.phone_whatsapp ? <span className="rounded-full bg-white/15 px-3 py-1">📱 WhatsApp {shop.phone_whatsapp}</span> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <CheckoutForm
          shopSlug={shop.slug}
          products={(products ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            price_cents: p.price_cents,
            description: p.description,
            image_url: p.image_url,
          }))}
          lang={lang}
        />

        {(products?.length ?? 0) === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            {t(lang, "buyer.menu_soon")}
          </div>
        ) : null}
      </div>
    </main>
  );
}
