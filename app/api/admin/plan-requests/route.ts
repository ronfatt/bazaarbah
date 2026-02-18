import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminByUserId } from "@/lib/auth";

export async function GET() {
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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("plan_requests")
    .select("id,user_id,target_plan,amount_cents,status,proof_image_url,reference_text,note,submitted_at,reviewed_at,profiles(display_name)")
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

