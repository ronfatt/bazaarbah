import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bindReferralIfEligible } from "@/lib/affiliate";

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
  const attached = await bindReferralIfEligible(admin, user.id, normalized);
  if (!attached) return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
