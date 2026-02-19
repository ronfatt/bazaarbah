"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { AppButton } from "@/components/ui/AppButton";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    const setup = async () => {
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          setStatus(error.message);
          setReady(false);
          return;
        }
      }
      setReady(true);
    };

    setup();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("Passwords do not match.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("Password updated. Redirecting to login...");
      window.setTimeout(() => {
        window.location.href = "/auth";
      }, 1200);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {!ready ? <p className="text-sm text-white/70">Validating reset link...</p> : null}
      <Input
        type="password"
        minLength={6}
        required
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={!ready || loading}
      />
      <Input
        type="password"
        minLength={6}
        required
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={!ready || loading}
      />
      <AppButton type="submit" variant="primary" className="w-full" disabled={!ready || loading}>
        {loading ? "Updating..." : "Update Password"}
      </AppButton>
      {status ? <p className="text-sm text-bb-muted">{status}</p> : null}
    </form>
  );
}
