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
  const { data: rows, error: loadError } = await admin.from("commission_ledger").select("id,status").in("id", body.ids);
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 400 });
  if (!rows || rows.length !== body.ids.length) {
    return NextResponse.json({ error: "Some ledger rows were not found." }, { status: 404 });
  }

  const uniqueStatuses = Array.from(new Set(rows.map((row) => row.status)));
  if (uniqueStatuses.length !== 1) {
    return NextResponse.json({ error: "Batch actions only work when all selected rows share the same status." }, { status: 400 });
  }

  const currentStatus = uniqueStatuses[0];
  const validAction =
    (body.action === "approve" && currentStatus === "PENDING") ||
    (body.action === "mark_paid" && currentStatus === "APPROVED") ||
    (body.action === "reverse" && currentStatus !== "REVERSED");

  if (!validAction) {
    return NextResponse.json({ error: "Selected rows do not match this action." }, { status: 400 });
  }

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
