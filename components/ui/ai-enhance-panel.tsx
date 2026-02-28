import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BeforeAfterCompare } from "@/components/ui/before-after-compare";
import { CreditBadge } from "@/components/ui/credit-badge";
import { t, type Lang } from "@/lib/i18n";

type EnhanceStyle = "studio" | "raya" | "premium";

export function AIEnhancePanel({
  imageOriginalUrl,
  imageEnhancedUrl,
  imageSource,
  imageCredits,
  style,
  generating,
  status,
  costPerEnhance,
  lang = "en",
  onStyleChange,
  onEnhance,
  onUseSource,
}: {
  imageOriginalUrl: string;
  imageEnhancedUrl: string;
  imageSource: "original" | "enhanced";
  imageCredits: number;
  style: EnhanceStyle;
  generating: boolean;
  status: string | null;
  costPerEnhance: number;
  lang?: Lang;
  onStyleChange: (style: EnhanceStyle) => void;
  onEnhance: () => void;
  onUseSource: (source: "original" | "enhanced") => void;
}) {
  const noCredits = imageCredits < costPerEnhance;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#163C33]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#F3F4F6]">✨ {t(lang, "products.ai_improve_title")}</h3>
          <p className="text-xs text-white/60">
            {t(lang, "products.ai_improve_desc")} {t(lang, "products.ai_credits_uses")} {costPerEnhance}
          </p>
        </div>
        <CreditBadge label={t(lang, "products.ai_credits_label")} value={imageCredits} />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["studio", t(lang, "products.style_studio")],
          ["raya", t(lang, "products.style_raya")],
          ["premium", t(lang, "products.style_premium")],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onStyleChange(id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              style === id
                ? "border-[#00C2A8]/50 bg-[#00C2A8]/20 text-[#00C2A8]"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ai"
          onClick={onEnhance}
          disabled={generating || noCredits || !imageOriginalUrl}
          className="rounded-xl"
        >
          {generating ? t(lang, "products.enhancing") : `${t(lang, "products.enhance_with_ai")} (${costPerEnhance} ${t(lang, "products.ai_credits_label")})`}
        </Button>
        {noCredits ? (
          <p className="text-xs text-amber-300">
            {t(lang, "products.not_enough_ai")}{" "}
            <Link href="/dashboard/billing" className="underline underline-offset-2">
              {t(lang, "products.go_billing")}
            </Link>
            .
          </p>
        ) : null}
      </div>

      {imageEnhancedUrl ? (
        <>
          <BeforeAfterCompare originalUrl={imageOriginalUrl} enhancedUrl={imageEnhancedUrl} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={imageSource === "enhanced" ? "default" : "outline"}
              onClick={() => onUseSource("enhanced")}
            >
              {t(lang, "products.use_enhanced_main")}
            </Button>
            <Button
              type="button"
              variant={imageSource === "original" ? "default" : "outline"}
              onClick={() => onUseSource("original")}
            >
              {t(lang, "products.keep_original")}
            </Button>
          </div>
        </>
      ) : null}

      {status ? <p className="text-sm text-white/70">{status}</p> : null}
    </div>
  );
}
