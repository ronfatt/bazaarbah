"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/input";
import { t, type Lang } from "@/lib/i18n";

export function AdminLoginForm({ lang = "en" }: { lang?: Lang }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = auth.user?.id;
      if (!userId) throw new Error(t(lang, "form.failed_login"));

      const { data: profile, error: roleErr } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (roleErr) throw roleErr;

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error(t(lang, "admin.not_admin"));
      }

      window.location.href = "/admin/plan-requests";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t(lang, "form.failed_login"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onLogin} className="space-y-3">
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" />
      <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t(lang, "form.password")} />

      <AppButton type="submit" variant="primary" disabled={loading} className="w-full">
        {loading ? t(lang, "form.wait") : t(lang, "admin.login_title")}
      </AppButton>

      {status && <p className="text-sm text-bb-muted">{status}</p>}
    </form>
  );
}
