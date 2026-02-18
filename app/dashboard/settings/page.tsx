import { Card } from "@/components/ui/card";
import { requireUnlockedSeller } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

export default async function SettingsPage() {
  const lang = await getLangFromCookie();
  await requireUnlockedSeller();
  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold text-[#F3F4F6]">{t(lang, "settings.title")}</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">{t(lang, "settings.desc")}</p>
      </Card>
    </section>
  );
}
