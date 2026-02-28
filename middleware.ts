import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AFFILIATE_REF_COOKIE } from "@/lib/affiliate";

export function middleware(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim().toUpperCase();
  if (!ref) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(AFFILIATE_REF_COOKIE, ref, {
    maxAge: 14 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
