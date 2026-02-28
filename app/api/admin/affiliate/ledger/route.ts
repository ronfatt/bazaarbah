import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminByUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["approve", "mark_paid", "reverse"]),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertAdminByUserId(user.id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const patch =
    body.action === "approve"
      ? { status: "APPROVED", approved_at: now }
      : body.action === "mark_paid"
        ? { status: "PAID", paid_at: now }
        : { status: "REVERSED", note: "Reversed by admin" };

  const { error } = await admin.from("commission_ledger").update(patch).in("id", body.ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("admin_audit_logs").insert({
    action: body.action === "approve" ? "commission_approved" : body.action === "mark_paid" ? "commission_paid" : "commission_reversed",
    actor_id: user.id,
    target_user_id: user.id,
    note: body.ids.join(","),
    meta: { ids: body.ids },
  });

  return NextResponse.json({ ok: true });
}
