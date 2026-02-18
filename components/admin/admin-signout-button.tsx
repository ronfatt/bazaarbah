"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { t, type Lang } from "@/lib/i18n";

export function AdminSignoutButton({ lang = "en" }: { lang?: Lang }) {
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    setLoading(true);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/admin/auth";
  }

  return (
    <AppButton variant="secondary" onClick={onSignOut} disabled={loading} className="h-9 px-3 text-xs">
      {loading ? `${t(lang, "common.sign_out")}...` : t(lang, "common.sign_out")}
    </AppButton>
  );
}
