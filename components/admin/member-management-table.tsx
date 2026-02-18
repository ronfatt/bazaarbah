"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";

type MemberRow = {
  id: string;
  display_name: string | null;
  role: "seller" | "admin";
  plan_tier: "free" | "pro_88" | "pro_128";
  copy_credits: number;
  image_credits: number;
  poster_credits: number;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
};

export function MemberManagementTable({ rows }: { rows: MemberRow[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [warningTitle, setWarningTitle] = useState<Record<string, string>>({});
  const [warningBody, setWarningBody] = useState<Record<string, string>>({});
  const [banReason, setBanReason] = useState<Record<string, string>>({});

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
      setStatus(json.error ?? "Action failed");
      return;
    }
    setStatus("Updated successfully.");
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#112E27]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-[#163C33] text-white/60">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5 text-white/80 hover:bg-[#163C33]/60">
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{row.display_name ?? "Member"}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-white/45">{row.id.slice(0, 10)}...</p>
                  <p className="mt-0.5 text-[11px] text-white/45">Joined {new Date(row.created_at).toLocaleDateString("en-MY")}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{row.plan_tier}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <AppButton className="h-7 px-2 text-[11px]" variant="secondary" onClick={() => run(row.id, { action: "set_plan", targetPlan: "free" })} disabled={busy === row.id}>
                      Free
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
                  <p>Copy {row.copy_credits}</p>
                  <p>Image {row.image_credits}</p>
                  <p>Poster {row.poster_credits}</p>
                </td>
                <td className="px-4 py-3">
                  {row.is_banned ? <Badge variant="cancelled">Banned</Badge> : <Badge variant="paid">Active</Badge>}
                  {row.ban_reason ? <p className="mt-1 text-xs text-rose-300">{row.ban_reason}</p> : null}
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    {row.is_banned ? (
                      <AppButton className="h-8 px-3 text-xs" variant="secondary" onClick={() => run(row.id, { action: "unban" })} disabled={busy === row.id}>
                        Unban
                      </AppButton>
                    ) : (
                      <div className="space-y-1">
                        <input
                          value={banReason[row.id] ?? ""}
                          onChange={(e) => setBanReason((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          placeholder="Ban reason (optional)"
                          className="h-8 w-48 rounded-lg border border-white/10 bg-[#0B241F] px-2 text-xs text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                        />
                        <AppButton
                          className="h-8 px-3 text-xs"
                          variant="secondary"
                          onClick={() => run(row.id, { action: "ban", reason: banReason[row.id] ?? "" })}
                          disabled={busy === row.id}
                        >
                          Ban
                        </AppButton>
                      </div>
                    )}

                    <div className="space-y-1">
                      <input
                        value={warningTitle[row.id] ?? ""}
                        onChange={(e) => setWarningTitle((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        placeholder="Warning title"
                        className="h-8 w-56 rounded-lg border border-white/10 bg-[#0B241F] px-2 text-xs text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                      />
                      <textarea
                        value={warningBody[row.id] ?? ""}
                        onChange={(e) => setWarningBody((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        placeholder="Warning message"
                        className="h-16 w-56 rounded-lg border border-white/10 bg-[#0B241F] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-bb-ai/45 focus:ring-2 focus:ring-bb-ai/20"
                      />
                      <AppButton
                        className="h-8 px-3 text-xs"
                        variant="ai"
                        onClick={() => run(row.id, { action: "warn", title: warningTitle[row.id] || "Account warning", body: warningBody[row.id] || "Please follow platform policy." })}
                        disabled={busy === row.id}
                      >
                        Send Warning
                      </AppButton>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/45">
                  No members found.
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

