import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckoutForm } from "@/components/buyer/checkout-form";
import { normalizeTheme, themeTokens } from "@/lib/theme";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const lang = await getLangFromCookie();
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

  const theme = normalizeTheme(shop.theme);
  const token = themeTokens[theme];

  return (
    <main className={`min-h-screen bg-gradient-to-br ${token.page}`}>
      <div className="mx-auto w-full max-w-5xl px-6 py-10 md:px-10">
        <div className={`rounded-3xl border p-8 shadow-xl ${token.card}`}>
          <h1 className={`text-4xl font-bold ${token.text}`}>{shop.shop_name}</h1>
          <p className={`mt-2 text-sm ${token.text} opacity-85`}>{t(lang, "buyer.preorder")}</p>
        </div>

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <Card className="bg-white/96">
            <h2 className="text-lg font-semibold">{t(lang, "buyer.products")}</h2>
            <div className="mt-3 space-y-3">
              {(products ?? []).map((p) => (
                <div key={p.id} className="rounded-xl border border-neutral-200 p-3">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-neutral-600">{p.description}</p>
                </div>
              ))}
              {(products?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                  {t(lang, "buyer.menu_soon")}
                </div>
              )}
            </div>
          </Card>

          <CheckoutForm shopSlug={shop.slug} products={(products ?? []).map((p) => ({ id: p.id, name: p.name, price_cents: p.price_cents }))} lang={lang} />
        </section>
      </div>
    </main>
  );
}
