"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";

export function SignoutButton() {
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    setLoading(true);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/auth";
  }

  return (
    <AppButton variant="secondary" onClick={onSignOut} disabled={loading} className="px-3 py-2">
      {loading ? "Signing out..." : "Sign out"}
    </AppButton>
  );
}
