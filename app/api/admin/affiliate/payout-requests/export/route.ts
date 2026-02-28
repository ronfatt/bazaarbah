import { NextResponse } from "next/server";
import { requireAdminPortalUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getLangFromCookie } from "@/lib/i18n-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currencyFromCents, formatDateTimeMY } from "@/lib/utils";

type PayoutStatusFilter = "ALL" | "REQUESTED" | "APPROVED" | "PAID" | "REJECTED";

type BankInfo = {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  note?: string;
};

function csvEscape(value: string | null | undefined) {
  const text = value ?? "";
  return `"${text.replace(/"/g, '""')}"`;
}

function parseBankInfo(raw: string | null): BankInfo {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as BankInfo;
  } catch {
    return { note: raw };
  }
}

export async function GET(req: Request) {
  const lang = await getLangFromCookie();
  await requireAdminPortalUser();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const rawStatus = (url.searchParams.get("status") ?? "ALL") as PayoutStatusFilter;
  const status = ["ALL", "REQUESTED", "APPROVED", "PAID", "REJECTED"].includes(rawStatus) ? rawStatus : "ALL";

  const admin = createAdminClient();
  const [payoutsRes, profilesRes] = await Promise.all([
    admin.from("payout_requests").select("id,created_at,status,amount_cents,user_id,bank_info_json").order("created_at", { ascending: false }).limit(1000),
    admin.from("profiles").select("id,display_name"),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((row) => [row.id, row.display_name]));
  const rows = (payoutsRes.data ?? []).filter((row) => {
    const bank = parseBankInfo(row.bank_info_json);
    const matchStatus = status === "ALL" ? true : row.status === status;
    if (!matchStatus) return false;
    if (!q) return true;
    const haystack = `${profileMap.get(row.user_id) ?? ""} ${bank.bankName ?? ""} ${bank.accountName ?? ""} ${bank.accountNumber ?? ""} ${bank.note ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });

  const header = [
    t(lang, "affiliate.date"),
    t(lang, "affiliate.member"),
    t(lang, "affiliate.amount"),
    t(lang, "affiliate.status"),
    t(lang, "affiliate.bank_name"),
    t(lang, "affiliate.account_name"),
    t(lang, "affiliate.account_number"),
    t(lang, "affiliate.payout_note"),
  ];

  const csvRows = rows.map((row) => {
    const bank = parseBankInfo(row.bank_info_json);
    return [
      formatDateTimeMY(row.created_at),
      profileMap.get(row.user_id) ?? "",
      currencyFromCents(Number(row.amount_cents ?? 0)),
      row.status,
      bank.bankName ?? "",
      bank.accountName ?? "",
      bank.accountNumber ?? "",
      bank.note ?? "",
    ]
      .map(csvEscape)
      .join(",");
  });

  const csv = [header.map(csvEscape).join(","), ...csvRows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"affiliate-payouts-${stamp}.csv\"`,
    },
  });
}
