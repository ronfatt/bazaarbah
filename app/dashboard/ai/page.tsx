import { Card } from "@/components/ui/card";
import { AITools } from "@/components/dashboard/ai-tools";
import { requireUnlockedSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

export default async function AIPage() {
  const lang = await getLangFromCookie();
  const { user, profile } = await requireUnlockedSeller();
  const admin = createAdminClient();

  const { data: shop } = await admin.from("shops").select("id,theme").eq("owner_id", user.id).order("created_at", { ascending: true }).maybeSingle();

  return (
    <section className="space-y-4">
      <Card className="bg-gradient-to-br from-[#112E27] to-[#163C33]">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#00C2A8]/10 text-[#00C2A8] text-xs font-medium">{t(lang, "ai.ops")}</span>
        <h1 className="mt-3 text-2xl font-bold text-[#F3F4F6]">{t(lang, "ai.bundle")}</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">{t(lang, "ai.bundle_desc")}</p>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
          <p className="rounded-lg border border-white/10 bg-[#112E27] px-3 py-2 text-[#F3F4F6]">{t(lang, "ai.copy_credits")} {profile.copy_credits}</p>
          <p className="rounded-lg border border-white/10 bg-[#112E27] px-3 py-2 text-[#F3F4F6]">{t(lang, "ai.image_credits")} {profile.image_credits}</p>
          <p className="rounded-lg border border-white/10 bg-[#112E27] px-3 py-2 text-[#F3F4F6]">{t(lang, "ai.poster_credits")} {profile.poster_credits}</p>
        </div>
      </Card>

      <AITools shopId={shop?.id} initialTheme={shop?.theme ?? "gold"} />
    </section>
  );
}
