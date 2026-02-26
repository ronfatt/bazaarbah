import type { SupabaseClient } from "@supabase/supabase-js";

function deriveDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.display_name === "string" && meta.display_name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim());

  if (fromMeta) return fromMeta;
  if (user.email) return user.email.split("@")[0] || user.email;
  return "Seller";
}

export async function syncProfilesFromAuthUsers(admin: SupabaseClient) {
  const perPage = 200;
  let page = 1;
  const authUsers: Array<{ id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }> = [];

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`List auth users failed: ${error.message}`);

    const users = data.users ?? [];
    if (!users.length) break;
    authUsers.push(
      ...users.map((u) => ({
        id: u.id,
        email: u.email,
        user_metadata: u.user_metadata ?? null,
      })),
    );
    if (users.length < perPage) break;
    page += 1;
  }

  if (!authUsers.length) return 0;

  const ids = authUsers.map((u) => u.id);
  const { data: existing, error: existingErr } = await admin.from("profiles").select("id").in("id", ids);
  if (existingErr) throw new Error(`Load existing profiles failed: ${existingErr.message}`);

  const existingIds = new Set((existing ?? []).map((row) => row.id));
  const missingRows = authUsers
    .filter((u) => !existingIds.has(u.id))
    .map((u) => ({
      id: u.id,
      display_name: deriveDisplayName(u),
      plan: "basic",
      plan_tier: "free",
      ai_credits: 10,
      copy_credits: 0,
      image_credits: 0,
      poster_credits: 0,
    }));

  if (!missingRows.length) return 0;

  const { error: insertErr } = await admin.from("profiles").insert(missingRows);
  if (insertErr) throw new Error(`Backfill profiles failed: ${insertErr.message}`);

  return missingRows.length;
}
