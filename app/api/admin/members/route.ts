import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";
import { syncProfilesFromAuthUsers } from "@/lib/supabase/sync-auth-profiles";

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
  await syncProfilesFromAuthUsers(admin);
  const [{ data, error }, { data: shops }] = await Promise.all([
    admin
      .from("profiles")
      .select("id,display_name,role,plan_tier,ai_credits,copy_credits,image_credits,poster_credits,is_banned,banned_at,ban_reason,created_at")
      .order("created_at", { ascending: false }),
    admin.from("shops").select("owner_id,phone_whatsapp,created_at").order("created_at", { ascending: true }),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const phoneByOwner = new Map<string, string>();
  for (const shop of shops ?? []) {
    if (shop.owner_id && shop.phone_whatsapp && !phoneByOwner.has(shop.owner_id)) {
      phoneByOwner.set(shop.owner_id, shop.phone_whatsapp);
    }
  }

  const emailByUserId = new Map<string, string>();
  const perPage = 200;
  let page = 1;
  while (true) {
    const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ page, perPage });
    if (listErr) break;
    const users = usersPage.users ?? [];
    if (!users.length) break;
    for (const u of users) {
      if (u.email) emailByUserId.set(u.id, u.email);
    }
    if (users.length < perPage) break;
    page += 1;
  }

  const members = (data ?? []).map((row) => ({
    ...row,
    email: emailByUserId.get(row.id) ?? null,
    phone_whatsapp: phoneByOwner.get(row.id) ?? null,
  }));

  const rows = members.filter((row) => {
    if (status === "banned" && !row.is_banned) return false;
    if (status === "active" && row.is_banned) return false;
    if (!q) return true;
    const haystack = `${row.display_name ?? ""} ${row.email ?? ""} ${row.phone_whatsapp ?? ""} ${row.id} ${row.plan_tier}`.toLowerCase();
    return haystack.includes(q);
  });

  return NextResponse.json({ members: rows });
}
