import { NextRequest, NextResponse } from "next/server";
import { LANG_COOKIE, normalizeLang } from "@/lib/i18n";

export async function POST(req: NextRequest) {
  let lang = "en";
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { lang?: string };
    lang = normalizeLang(body.lang);
  } else {
    const form = await req.formData().catch(() => null);
    lang = normalizeLang(String(form?.get("lang") ?? "en"));
  }

  const res = NextResponse.json({ ok: true, lang });
  res.cookies.set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

