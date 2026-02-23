import { Card } from "@/components/ui/card";
import { ShopForm } from "@/components/dashboard/shop-form";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";
import { hasUnlockedFeatures } from "@/lib/plan";

export default async function ShopPage() {
  const lang = await getLangFromCookie();
  const { user, profile } = await requireSeller();
  const admin = createAdminClient();
  const readOnly = !hasUnlockedFeatures(profile);

  const { data: shops } = await admin.from("shops").select("*").eq("owner_id", user.id).order("created_at", { ascending: true });
  const shop = shops?.[0] ?? null;

  return (
    <section className="space-y-4">
      <Card>
        <p className="text-xs uppercase tracking-wider text-white/45">{t(lang, "shop.setup.step")}</p>
        <p className="mt-2 text-sm text-white/65">{t(lang, "shop.setup.flow")}</p>
        <h1 className="mt-4 text-2xl font-bold text-[#F3F4F6]">{t(lang, "shop.setup.title")}</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">{t(lang, "shop.setup.desc")}</p>
        <p className="mt-1 text-xs text-white/45">{t(lang, "shop.setup.once")}</p>
        <div className="mt-4 rounded-xl border border-bb-ai/15 bg-bb-ai/10 p-3 text-sm text-white/80">{t(lang, "shop.setup.relax")}</div>
        <div className="mt-6">
          <ShopForm initialShop={shop} readOnly={readOnly} lang={lang} />
        </div>
      </Card>
    </section>
  );
}
