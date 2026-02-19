import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default async function Home() {
  const lang = await getLangFromCookie();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  } catch {
    // Keep welcome page available even if auth bootstrap is temporarily unavailable.
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_40%,#123F33_0%,#0B1F1A_70%)] text-bb-text">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] [background-image:radial-gradient(#fff_0.6px,transparent_0.6px)] [background-size:7px_7px]" />

      <div className="relative px-8 py-8">
        <header className="flex items-center justify-between">
          <div className="w-full max-w-[220px]">
            <Image src="/logo-auth.png" alt="BazaarBah" width={720} height={360} className="h-auto w-full object-contain" priority />
            <p className="mt-1 text-sm text-bb-muted">{t(lang, "home.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher current={lang} labels={{ en: t(lang, "lang.en"), zh: t(lang, "lang.zh"), ms: t(lang, "lang.ms") }} />
            <Link href="/auth">
              <AppButton variant="secondary">{t(lang, "home.login")}</AppButton>
            </Link>
            <Link href="/admin/auth">
              <AppButton variant="ghost">{t(lang, "home.admin")}</AppButton>
            </Link>
          </div>
        </header>

        <section className="mx-auto mt-20 grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-bb-ai/20 bg-bb-ai/10 px-3 py-1 text-xs font-medium text-bb-ai">
              <Sparkles size={13} /> {t(lang, "home.badge")}
            </p>
            <h1 className="text-5xl font-bold leading-tight">{t(lang, "home.title")}</h1>
            <p className="max-w-2xl text-lg text-bb-muted">{t(lang, "home.desc")}</p>
            <div className="space-y-3 pt-2 text-sm text-bb-text">
              <p className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-bb-ai" /> {t(lang, "home.b1")}</p>
              <p className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-bb-ai" /> {t(lang, "home.b2")}</p>
              <p className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-bb-ai" /> {t(lang, "home.b3")}</p>
            </div>
          </div>

          <AppCard className="p-8 bg-bb-surface/55 border-bb-ai/10 shadow-glowAI">
            <h2 className="text-2xl font-bold">{t(lang, "home.welcome")}</h2>
            <p className="mt-2 text-sm text-bb-muted">{t(lang, "home.welcome_desc")}</p>
            <div className="mt-6 flex gap-3">
              <Link href="/auth">
                <AppButton variant="primary" size="lg">{t(lang, "home.go_login")}</AppButton>
              </Link>
              <Link href="/s/demo">
                <AppButton variant="secondary" size="lg">{t(lang, "home.demo")}</AppButton>
              </Link>
            </div>
          </AppCard>
        </section>
      </div>
    </main>
  );
}
