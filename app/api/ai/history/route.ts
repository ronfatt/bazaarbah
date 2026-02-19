import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const olderThanDaysRaw = req.nextUrl.searchParams.get("olderThanDays");
  const olderThanDays = Number(olderThanDaysRaw ?? "30");
  if (!Number.isFinite(olderThanDays) || olderThanDays < 1 || olderThanDays > 3650) {
    return NextResponse.json({ error: "Invalid olderThanDays" }, { status: 400 });
  }

  const type = req.nextUrl.searchParams.get("type");
  const validType = type === "product_image" || type === "poster" || type === "copy" ? type : null;
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  let query = admin.from("ai_jobs").delete().eq("owner_id", user.id).lt("created_at", cutoff);
  if (validType) query = query.eq("type", validType);
  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
