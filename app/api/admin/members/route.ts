import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertAdminByUserId(user.id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "all";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,display_name,role,plan_tier,copy_credits,image_credits,poster_credits,is_banned,banned_at,ban_reason,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []).filter((row) => {
    if (status === "banned" && !row.is_banned) return false;
    if (status === "active" && row.is_banned) return false;
    if (!q) return true;
    const haystack = `${row.display_name ?? ""} ${row.id} ${row.plan_tier}`.toLowerCase();
    return haystack.includes(q);
  });

  return NextResponse.json({ members: rows });
}

