import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  code: z.string().trim().min(4).max(20),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("id,referred_by").eq("id", user.id).maybeSingle();
  if (!me) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (me.referred_by) return NextResponse.json({ ok: true });

  const normalized = payload.code.toUpperCase();
  const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", normalized).maybeSingle();
  if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
  if (referrer.id === user.id) return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });

  const { error } = await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id).is("referred_by", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

