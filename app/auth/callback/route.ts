import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (!code) {
    if (type === "recovery") {
      const redirectUrl = new URL(next, request.url);
      if (tokenHash) {
        redirectUrl.searchParams.set("token_hash", tokenHash);
      }
      redirectUrl.searchParams.set("type", type);
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.redirect(new URL("/auth", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth?error=login_failed", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
