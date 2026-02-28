"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import { t, type Lang } from "@/lib/i18n";
import { formatDateMY } from "@/lib/utils";

type MemberRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone_whatsapp: string | null;
  role: "seller" | "admin";
  plan_tier: "free" | "pro_88" | "pro_128";
  ai_credits: number;
  copy_credits: number;
  image_credits: number;
  poster_credits: number;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
};

export function MemberManagementTable({ rows, lang = "en" }: { rows: MemberRow[]; lang?: Lang }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [warningTitle, setWarningTitle] = useState<Record<string, string>>({});
  const [warningBody, setWarningBody] = useState<Record<string, string>>({});
  const [banReason, setBanReason] = useState<Record<string, string>>({});
  const [creditDelta, setCreditDelta] = useState<Record<string, string>>({});

  async function run(memberId: string, payload: Record<string, unknown>) {
    setBusy(memberId);
    setStatus(null);
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setStatus(json.error ?? t(lang, "common.failed"));
      return;
    }
    setStatus(t(lang, "common.ok"));
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#112E27]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-[#163C33] text-white/60">
            <tr>
              <th className="px-4 py-3">{t(lang, "admin.members")}</th>
              <th className="px-4 py-3">{t(lang, "admin.plan_column")}</th>
              <th className="px-4 py-3">{t(lang, "admin.credits")}</th>
              <th className="px-4 py-3">{t(lang, "dashboard.status")}</th>
              <th className="px-4 py-3">{t(lang, "common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5 text-white/80 hover:bg-[#163C33]/60">
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{row.display_name ?? t(lang, "admin.members")}</p>
                  <p className="mt-0.5 text-[11px] text-white/60">{row.email ?? t(lang, "admin.no_email")}</p>
                  <p className="mt-0.5 text-[11px] text-white/45">{t(lang, "admin.whatsapp")}: {row.phone_whatsapp ?? "-"}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-white/45">{row.id.slice(0, 10)}...</p>
                  <p className="mt-0.5 text-[11px] text-white/45">{t(lang, "admin.joined")} {formatDateMY(row.created_at)}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{row.plan_tier}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <AppButton className="h-7 px-2 text-[11px]" variant="secondary" onClick={() => run(row.id, { action: "set_plan", targetPlan: "free" })} disabled={busy === row.id}>
                      {t(lang, "plan.free")}
                    </AppButton>
                    <AppButton className="h-7 px-2 text-[11px]" variant="secondary" onClick={() => run(row.id, { action: "set_plan", targetPlan: "pro_88" })} disabled={busy === row.id}>
                      RM88
                    </AppButton>
                    <AppButton className="h-7 px-2 text-[11px]" variant="secondary" onClick={() => run(row.id, { action: "set_plan", targetPlan: "pro_128" })} disabled={busy === row.id}>
                      RM128
                    </AppButton>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-white/65">
                  <p className="text-white font-semibold">AI {row.ai_credits}</p>
                  <p>Copy {row.copy_credits}</p>
                  <p>Image {row.image_credits}</p>
                  <p>Poster {row.poster_credits}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={creditDelta[row.id] ?? ""}
                      onChange={(e) => setCreditDelta((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder="+10 / -5"
                      className="h-8 w-24 rounded-lg border border-white/10 bg-[#0B241F] px-2 text-xs text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                    />
                    <AppButton
                      className="h-8 px-2 text-[11px]"
                      variant="ai"
                      onClick={() => {
                        const amount = Number(creditDelta[row.id] ?? 0);
                        if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount === 0) {
                          setStatus(t(lang, "admin.credit_amount_error"));
                          return;
                        }
                        run(row.id, { action: "adjust_ai_credits", amount });
                      }}
                      disabled={busy === row.id}
                    >
                      {t(lang, "admin.adjust")}
                    </AppButton>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {row.is_banned ? <Badge variant="cancelled">{t(lang, "admin.banned_badge")}</Badge> : <Badge variant="paid">{t(lang, "plan.active")}</Badge>}
                  {row.ban_reason ? <p className="mt-1 text-xs text-rose-300">{row.ban_reason}</p> : null}
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    {row.is_banned ? (
                      <AppButton className="h-8 px-3 text-xs" variant="secondary" onClick={() => run(row.id, { action: "unban" })} disabled={busy === row.id}>
                        {t(lang, "admin.unban")}
                      </AppButton>
                    ) : (
                      <div className="space-y-1">
                        <input
                          value={banReason[row.id] ?? ""}
                          onChange={(e) => setBanReason((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          placeholder={t(lang, "admin.ban_reason_optional")}
                          className="h-8 w-48 rounded-lg border border-white/10 bg-[#0B241F] px-2 text-xs text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                        />
                        <AppButton
                          className="h-8 px-3 text-xs"
                          variant="secondary"
                          onClick={() => run(row.id, { action: "ban", reason: banReason[row.id] ?? "" })}
                          disabled={busy === row.id}
                        >
                          {t(lang, "admin.ban")}
                        </AppButton>
                      </div>
                    )}

                    <div className="space-y-1">
                      <input
                        value={warningTitle[row.id] ?? ""}
                        onChange={(e) => setWarningTitle((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        placeholder={t(lang, "admin.warning_title")}
                        className="h-8 w-56 rounded-lg border border-white/10 bg-[#0B241F] px-2 text-xs text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                      />
                      <textarea
                        value={warningBody[row.id] ?? ""}
                        onChange={(e) => setWarningBody((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        placeholder={t(lang, "admin.warning_message")}
                        className="h-16 w-56 rounded-lg border border-white/10 bg-[#0B241F] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                      />
                      <AppButton
                        className="h-8 px-3 text-xs"
                        variant="ai"
                        onClick={() => run(row.id, { action: "warn", title: warningTitle[row.id] || t(lang, "admin.warning_default_title"), body: warningBody[row.id] || t(lang, "admin.warning_default_body") })}
                        disabled={busy === row.id}
                      >
                        {t(lang, "admin.send_warning")}
                      </AppButton>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/45">
                  {t(lang, "admin.no_members_found")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {status ? <p className="text-sm text-white/80">{status}</p> : null}
    </div>
  );
}
