import { LoginForm } from "@/components/auth/login-form";
import { Store, Wand2, ReceiptText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string; ref?: string }> }) {
  const lang = await getLangFromCookie();
  const params = await searchParams;
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_25%_30%,rgba(0,194,168,0.10),transparent_42%),radial-gradient(circle_at_80%_22%,rgba(201,162,39,0.09),transparent_40%),radial-gradient(circle_at_52%_55%,rgba(255,255,255,0.06),transparent_45%),#071A16] text-bb-text">
      <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(rgba(255,255,255,0.8)_0.55px,transparent_0.55px)] [background-size:7px_7px]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-8 py-10 lg:grid-cols-[0.42fr_0.58fr]">
        <section className="flex flex-col justify-center">
          <div className="w-full max-w-[360px]">
            <Image src="/logo-auth.png" alt="BazaarBah" width={720} height={360} className="h-auto w-full object-contain" priority />
          </div>
          <h1 className="mt-3 text-4xl font-bold">{t(lang, "auth.title")}</h1>
          <p className="mt-3 text-sm text-white/65">{t(lang, "auth.desc")}</p>

          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-white/12 bg-white/5 p-4 backdrop-blur-xl hover:border-white/18 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-bb-ai" />
                  <p className="text-sm font-semibold">{t(lang, "auth.feature1")}</p>
                </div>
                <span className="rounded-full border border-bb-ai/20 bg-bb-ai/10 px-2 py-0.5 text-[10px] text-bb-ai">{t(lang, "auth.tag.fast")}</span>
              </div>
              <p className="mt-1 text-xs text-white/45">{t(lang, "auth.feature1_desc")}</p>
            </div>

            <div className="rounded-xl border border-white/12 bg-white/5 p-4 backdrop-blur-xl hover:border-white/18 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 size={16} className="text-bb-ai" />
                  <p className="text-sm font-semibold">{t(lang, "auth.feature2")}</p>
                </div>
                <span className="rounded-full border border-bb-ai/20 bg-bb-ai/10 px-2 py-0.5 text-[10px] text-bb-ai">{t(lang, "auth.tag.ai")}</span>
              </div>
              <p className="mt-1 text-xs text-white/45">{t(lang, "auth.feature2_desc")}</p>
            </div>

            <div className="rounded-xl border border-white/12 bg-white/5 p-4 backdrop-blur-xl hover:border-white/18 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptText size={16} className="text-bb-ai" />
                  <p className="text-sm font-semibold">{t(lang, "auth.feature3")}</p>
                </div>
                <span className="rounded-full border border-bb-ai/20 bg-bb-ai/10 px-2 py-0.5 text-[10px] text-bb-ai">{t(lang, "auth.tag.ops")}</span>
              </div>
              <p className="mt-1 text-xs text-white/45">{t(lang, "auth.feature3_desc")}</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/12 bg-bb-surface/70 p-8 shadow-[0_0_40px_rgba(0,194,168,0.1)] backdrop-blur-xl hover:border-white/18 transition">
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-[0.16em] text-white/45">SELLER ACCESS</p>
              <LanguageSwitcher current={lang} labels={{ en: t(lang, "lang.en"), zh: t(lang, "lang.zh"), ms: t(lang, "lang.ms") }} />
            </div>
            <h2 className="mt-2 text-3xl font-bold">{t(lang, "auth.login_title")}</h2>
            <p className="mt-2 text-sm text-white/65">{t(lang, "auth.login_desc")}</p>
            {params.error === "banned" ? <p className="mt-2 text-sm text-rose-300">{t(lang, "auth.banned")}</p> : null}
            <div className="mt-6">
              <LoginForm
                defaultReferralCode={params.ref ?? ""}
                i18n={{
                  emailPlaceholder: t(lang, "form.email"),
                  passwordPlaceholder: t(lang, "form.password"),
                  referralPlaceholder: t(lang, "form.referral"),
                  login: t(lang, "form.login"),
                  register: t(lang, "form.register"),
                  wait: t(lang, "form.wait"),
                  created: t(lang, "form.created"),
                  failedLogin: t(lang, "form.failed_login"),
                  failedRegister: t(lang, "form.failed_register"),
                  forgotPassword: t(lang, "form.forgot_password"),
                  sendReset: t(lang, "form.send_reset"),
                  resetSent: t(lang, "form.reset_sent"),
                  emailRequired: t(lang, "form.email_required"),
                }}
              />
            </div>
            <div className="mt-3">
              <Link href="/admin/auth" className="text-xs text-white/45 hover:text-bb-ai">
                {t(lang, "auth.admin_login")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
