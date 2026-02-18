import { Badge } from "@/components/ui/Badge";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import type { Lang } from "@/lib/i18n";

type Props = {
  email: string;
  credits: number;
  initial: string;
  signout: React.ReactNode;
  lang: Lang;
  i18n: {
    welcome: string;
    aiCredits: string;
    langEn: string;
    langZh: string;
    langMs: string;
  };
};

export function Topbar({ email, credits, initial, signout, lang, i18n }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-bb-bg/70 backdrop-blur-xl border-b border-bb-border/5">
      <div className="h-16 px-6 flex items-center justify-between">
        <div className="text-sm text-white/65">
          {i18n.welcome} <span className="text-bb-text font-medium">{email}</span>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher current={lang} labels={{ en: i18n.langEn, zh: i18n.langZh, ms: i18n.langMs }} />
          <Badge variant="ai">
            {i18n.aiCredits} {credits}
          </Badge>
          <div className="h-9 w-9 rounded-full bg-bb-surface2/80 border border-bb-border/10 grid place-items-center text-sm font-semibold">{initial}</div>
          {signout}
        </div>
      </div>
    </div>
  );
}
