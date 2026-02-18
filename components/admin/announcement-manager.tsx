"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import { t, type Lang } from "@/lib/i18n";

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
};

export function AnnouncementManager({ announcements, lang = "en" }: { announcements: Announcement[]; lang?: Lang }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function publish() {
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(json.error ?? "Failed");
      return;
    }
    setStatus(t(lang, "admin.announcement_desc"));
    window.location.reload();
  }

  async function toggleActive(id: string, isActive: boolean) {
    setBusy(true);
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setBusy(false);
    if (res.ok) window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#163C33] p-5">
        <h3 className="text-lg font-semibold text-white">{t(lang, "admin.announcement_center")}</h3>
        <p className="mt-1 text-sm text-white/65">{t(lang, "admin.announcement_desc")}</p>
        <div className="mt-3 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Announcement body"
            className="h-28 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
          />
        </div>
        <div className="mt-3">
          <AppButton onClick={publish} disabled={busy || title.trim().length < 2 || body.trim().length < 4}>
            {busy ? "..." : t(lang, "admin.announcements")}
          </AppButton>
        </div>
        {status ? <p className="mt-2 text-sm text-white/80">{status}</p> : null}
      </div>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-xl border border-white/10 bg-[#163C33] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">{a.title}</p>
              <Badge variant={a.is_active ? "paid" : "neutral"}>{a.is_active ? t(lang, "plan.active") : "Inactive"}</Badge>
            </div>
            <p className="mt-2 text-sm text-white/75">{a.body}</p>
            <p className="mt-2 text-xs text-white/45">{new Date(a.created_at).toLocaleString("en-MY")}</p>
            <div className="mt-3">
              {a.is_active ? (
                <AppButton variant="secondary" className="h-8 px-3 text-xs" onClick={() => toggleActive(a.id, false)} disabled={busy}>
                  Archive
                </AppButton>
              ) : (
                <AppButton variant="secondary" className="h-8 px-3 text-xs" onClick={() => toggleActive(a.id, true)} disabled={busy}>
                  Re-activate
                </AppButton>
              )}
            </div>
          </div>
        ))}
        {announcements.length === 0 ? <p className="text-sm text-white/45">No announcements yet.</p> : null}
      </div>
    </div>
  );
}
