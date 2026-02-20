import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default async function Home() {
  const lang = await getLangFromCookie();
  const isBm = lang === "ms";
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/55" />

      <div className="relative px-8 py-8">
        <header className="flex items-center justify-between">
          <div className="w-full max-w-[220px]">
            <Image src="/logo-auth.png" alt="BazaarBah" width={720} height={360} className="h-auto w-full object-contain" priority />
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

        <section className="mx-auto mt-20 grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-md lg:p-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <Sparkles size={13} /> {t(lang, "home.badge")}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-white md:text-6xl">{t(lang, "home.title")}</h1>
            <p className="mt-4 max-w-xl text-base text-white/70 md:text-lg">{t(lang, "home.desc")}</p>
            {isBm ? <p className="mt-2 text-sm text-white/60">{t(lang, "home.subline")}</p> : null}
            <ul className="mt-6 space-y-3 text-sm text-white/75">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-4 w-4 rounded-full border border-emerald-300/30 bg-emerald-400/20" />
                <span>{t(lang, "home.b1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-4 w-4 rounded-full border border-emerald-300/30 bg-emerald-400/20" />
                <span>{t(lang, "home.b2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-4 w-4 rounded-full border border-emerald-300/30 bg-emerald-400/20" />
                <span>{t(lang, "home.b3")}</span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-white/50">{t(lang, "home.footnote")}</p>
          </div>

          <AppCard className="border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-md lg:p-8">
            <h2 className="text-xl font-bold text-white">{t(lang, "home.welcome")}</h2>
            <p className="mt-2 text-sm text-white/65">{t(lang, "home.welcome_desc")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/auth">
                <AppButton variant="primary" size="lg">{t(lang, "home.go_login")}</AppButton>
              </Link>
              <Link href="/s/demo">
                <AppButton variant="secondary" size="lg">{t(lang, "home.demo")}</AppButton>
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/50">{t(lang, "home.footnote")}</p>
          </AppCard>
        </section>
      </div>
    </main>
  );
}
