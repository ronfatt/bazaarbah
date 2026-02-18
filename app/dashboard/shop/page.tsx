import { Card } from "@/components/ui/card";
import { ShopForm } from "@/components/dashboard/shop-form";
import { requireUnlockedSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

export default async function ShopPage() {
  const lang = await getLangFromCookie();
  const { user } = await requireUnlockedSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("*").eq("owner_id", user.id).order("created_at", { ascending: true });
  const shop = shops?.[0] ?? null;

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold text-[#F3F4F6]">{t(lang, "shop.title")}</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">{t(lang, "shop.desc")}</p>
        <div className="mt-6">
          <ShopForm initialShop={shop} lang={lang} />
        </div>
      </Card>
    </section>
  );
}
