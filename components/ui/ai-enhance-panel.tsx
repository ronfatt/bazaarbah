import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BeforeAfterCompare } from "@/components/ui/before-after-compare";
import { CreditBadge } from "@/components/ui/credit-badge";

type EnhanceStyle = "studio" | "raya" | "premium";

export function AIEnhancePanel({
  imageOriginalUrl,
  imageEnhancedUrl,
  imageSource,
  imageCredits,
  style,
  generating,
  status,
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
  onStyleChange: (style: EnhanceStyle) => void;
  onEnhance: () => void;
  onUseSource: (source: "original" | "enhanced") => void;
}) {
  const noCredits = imageCredits < 1;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#163C33]/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#F3F4F6]">✨ Improve Photo with AI</h3>
          <p className="text-xs text-white/60">
            Remove messy background and generate a clean, professional product photo. Uses 1 image credit.
          </p>
        </div>
        <CreditBadge label="AI credits" value={imageCredits} />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["studio", "Clean Studio"],
          ["raya", "Raya Festive"],
          ["premium", "Premium Dark"],
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
          {generating ? "Enhancing... (10-30s)" : "Enhance with AI (1 image credit)"}
        </Button>
        {noCredits ? (
          <p className="text-xs text-amber-300">
            Not enough AI credits.{" "}
            <Link href="/dashboard/billing" className="underline underline-offset-2">
              Go to Billing
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
              Use Enhanced as Main Photo
            </Button>
            <Button
              type="button"
              variant={imageSource === "original" ? "default" : "outline"}
              onClick={() => onUseSource("original")}
            >
              Keep Original
            </Button>
          </div>
        </>
      ) : null}

      {status ? <p className="text-sm text-white/70">{status}</p> : null}
    </div>
  );
}
