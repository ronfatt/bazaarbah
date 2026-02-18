"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
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
      if (!userId) throw new Error("Login failed");

      const { data: profile, error: roleErr } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (roleErr) throw roleErr;

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("This account is not admin.");
      }

      window.location.href = "/admin/plan-requests";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onLogin} className="space-y-3">
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" />
      <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />

      <AppButton type="submit" variant="primary" disabled={loading} className="w-full">
        {loading ? "Please wait..." : "Admin Login"}
      </AppButton>

      {status && <p className="text-sm text-bb-muted">{status}</p>}
    </form>
  );
}

