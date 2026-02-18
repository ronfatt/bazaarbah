"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/input";

export function LoginForm() {
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/dashboard";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister() {
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setStatus("Account created. If email confirmation is enabled, confirm email first.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onLogin} className="space-y-3">
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seller@email.com" />
      <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />

      <div className="flex gap-2">
        <AppButton type="submit" variant="primary" disabled={loading} className="w-full hover:scale-[1.02]">
          {loading ? "Please wait..." : "Login"}
        </AppButton>
        <AppButton type="button" variant="secondary" disabled={loading} className="w-full" onClick={onRegister}>
          Register
        </AppButton>
      </div>

      {status && <p className="text-sm text-bb-muted">{status}</p>}
    </form>
  );
}
