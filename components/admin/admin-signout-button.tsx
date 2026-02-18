"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";

export function AdminSignoutButton() {
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    setLoading(true);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/admin/auth";
  }

  return (
    <AppButton variant="secondary" onClick={onSignOut} disabled={loading} className="h-9 px-3 text-xs">
      {loading ? "Signing out..." : "Sign out"}
    </AppButton>
  );
}

