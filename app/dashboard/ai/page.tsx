import { Card } from "@/components/ui/card";
import { AITools } from "@/components/dashboard/ai-tools";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";

function parseHistory(raw: string | null) {
  if (!raw) return { imageUrl: null as string | null, payload: null as Record<string, unknown> | null };
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return { imageUrl: raw, payload: null };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const imageUrl =
      (typeof parsed.posterUrl === "string" && parsed.posterUrl) ||
      (typeof parsed.imageUrl === "string" && parsed.imageUrl) ||
      null;
    return { imageUrl, payload: parsed };
  } catch {
    return { imageUrl: null, payload: null };
  }
}

export default async function AIPage() {
  const lang = await getLangFromCookie();
  const { user, profile } = await requireSeller();
  const admin = createAdminClient();

  const { data: shop } = await admin
    .from("shops")
    .select("id,theme,shop_name,phone_whatsapp,slug")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .maybeSingle();
  const { data: products } = await admin
    .from("products")
    .select("id,name,description,price_cents,image_original_url,image_enhanced_url,image_source,image_url")
    .eq("shop_id", shop?.id ?? "");
  const { data: jobs } = await admin
    .from("ai_jobs")
    .select("id,type,result_url,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const { data: costs } = await admin.from("ai_credit_costs").select("ai_type,cost");
  const creditCosts = {
    copy: Number(costs?.find((c) => c.ai_type === "copy")?.cost ?? 1),
    product_image: Number(costs?.find((c) => c.ai_type === "product_image")?.cost ?? 1),
    poster: Number(costs?.find((c) => c.ai_type === "poster")?.cost ?? 1),
  } as const;

  const history = (jobs ?? []).map((job) => {
    const parsed = parseHistory(job.result_url);
    return {
      id: job.id,
      type: job.type as "product_image" | "poster" | "copy",
      createdAt: job.created_at,
      imageUrl: parsed.imageUrl,
      payload: parsed.payload,
    };
  });

  return (
    <section className="space-y-4">
      <Card className="bg-gradient-to-br from-[#112E27] to-[#163C33]">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#00C2A8]/10 text-[#00C2A8] text-xs font-medium">{t(lang, "ai.ops")}</span>
        <h1 className="mt-3 text-2xl font-bold text-[#F3F4F6]">{t(lang, "ai.bundle")}</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">{t(lang, "ai.bundle_desc")}</p>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          <p className="rounded-lg border border-white/10 bg-[#112E27] px-3 py-2 text-[#F3F4F6]">{t(lang, "topbar.ai_credits")} {profile.ai_credits ?? 0}</p>
          <p className="rounded-lg border border-white/10 bg-[#112E27] px-3 py-2 text-[#F3F4F6]">
            Cost per use: Copy {creditCosts.copy} • Image {creditCosts.product_image} • Poster {creditCosts.poster}
          </p>
        </div>
      </Card>

      <AITools
        shopId={shop?.id}
        initialTheme={shop?.theme ?? "gold"}
        lang={lang}
        products={products ?? []}
        history={history}
        creditCosts={creditCosts}
        shopProfile={{
          shopName: shop?.shop_name ?? "",
          whatsapp: shop?.phone_whatsapp ?? "",
          shopSlug: shop?.slug ?? "",
        }}
      />
    </section>
  );
}
