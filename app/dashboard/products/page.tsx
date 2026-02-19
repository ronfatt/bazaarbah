import { ProductManager } from "@/components/dashboard/product-manager";
import { requireUnlockedSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import type { Product, Shop } from "@/types";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

export default async function ProductsPage() {
  const lang = await getLangFromCookie();
  const { user } = await requireUnlockedSeller();
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("ai_credits").eq("id", user.id).maybeSingle();
  const { data: shops } = await admin.from("shops").select("*").eq("owner_id", user.id).order("created_at", { ascending: true });
  const shopIds = shops?.map((s) => s.id) ?? [];

  const { data: products } = shopIds.length
    ? await admin.from("products").select("*").in("shop_id", shopIds).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold text-[#F3F4F6]">{t(lang, "products.title")}</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">{t(lang, "products.desc")}</p>
      </Card>
      <ProductManager shops={(shops ?? []) as Shop[]} products={(products ?? []) as Product[]} aiCredits={profile?.ai_credits ?? 0} lang={lang} />
    </section>
  );
}
