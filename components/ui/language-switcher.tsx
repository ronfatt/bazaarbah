"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";

export function LanguageSwitcher({
  current,
  labels,
}: {
  current: Lang;
  labels: { en: string; zh: string; ms: string };
}) {
  const [value, setValue] = useState<Lang>(current);
  const [loading, setLoading] = useState(false);

  async function onChange(next: Lang) {
    setValue(next);
    setLoading(true);
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: next }),
    });
    setLoading(false);
    window.location.reload();
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Lang)}
      disabled={loading}
      className="h-9 rounded-xl border border-bb-border/10 bg-bb-surface/60 px-2 text-xs text-bb-text"
    >
      <option value="en">{labels.en}</option>
      <option value="zh">{labels.zh}</option>
      <option value="ms">{labels.ms}</option>
    </select>
  );
}

