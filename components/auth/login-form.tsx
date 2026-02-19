"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/input";

export function LoginForm({
  defaultReferralCode = "",
  i18n,
}: {
  defaultReferralCode?: string;
  i18n?: {
    emailPlaceholder: string;
    passwordPlaceholder: string;
    referralPlaceholder: string;
    login: string;
    register: string;
    wait: string;
    created: string;
    failedLogin: string;
    failedRegister: string;
    forgotPassword: string;
    sendReset: string;
    resetSent: string;
    emailRequired: string;
  };
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(defaultReferralCode);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const texts = useMemo(
    () => ({
      emailPlaceholder: "seller@email.com",
      passwordPlaceholder: "Password",
      referralPlaceholder: "Referral code (optional)",
      login: "Login",
      register: "Register",
      wait: "Please wait...",
      created: "Account created. If email confirmation is enabled, confirm email first.",
      failedLogin: "Login failed",
      failedRegister: "Register failed",
      forgotPassword: "Forgot password?",
      sendReset: "Send reset link",
      resetSent: "Password reset email sent. Check your inbox.",
      emailRequired: "Enter your email first.",
      ...i18n,
    }),
    [i18n],
  );

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/dashboard";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : texts.failedLogin);
    } finally {
      setLoading(false);
    }
  }

  async function onRegister() {
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: referralCode.trim() ? { referral_code: referralCode.trim().toUpperCase() } : {},
        },
      });
      if (error) throw error;
      setStatus(texts.created);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : texts.failedRegister);
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      setStatus(texts.emailRequired);
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      if (error) throw error;
      setStatus(texts.resetSent);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : texts.failedLogin);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onLogin} className="space-y-3">
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={texts.emailPlaceholder} />
      <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={texts.passwordPlaceholder} />
      <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder={texts.referralPlaceholder} />

      <div className="flex gap-2">
        <AppButton type="submit" variant="primary" disabled={loading} className="w-full hover:scale-[1.02]">
          {loading ? texts.wait : texts.login}
        </AppButton>
        <AppButton type="button" variant="ghost" disabled={loading} className="w-full" onClick={onRegister}>
          {texts.register}
        </AppButton>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-xs text-bb-ai hover:underline"
          onClick={onForgotPassword}
          disabled={loading}
        >
          {texts.forgotPassword} {texts.sendReset}
        </button>
      </div>

      {status && <p className="text-sm text-bb-muted">{status}</p>}
    </form>
  );
}
