import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableAffiliatePayoutCents, AFFILIATE_MIN_PAYOUT_CENTS } from "@/lib/affiliate";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  amountCents: z.number().int().positive(),
  bankInfo: z.object({
    bankName: z.string().trim().min(2).max(100),
    accountName: z.string().trim().min(2).max(120),
    accountNumber: z.string().trim().min(4).max(40),
    note: z.string().trim().max(1000).optional().default(""),
  }),
});

export async function POST(req: NextRequest) {
  const { user, profile } = await requireSeller();
  if (!profile.is_affiliate_enabled) {
    return NextResponse.json({ error: "Affiliate access is locked." }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const available = await getAvailableAffiliatePayoutCents(admin, user.id);
  if (body.amountCents < AFFILIATE_MIN_PAYOUT_CENTS) {
    return NextResponse.json({ error: "Minimum payout is RM100." }, { status: 400 });
  }
  if (body.amountCents > available) {
    return NextResponse.json({ error: "Requested amount exceeds available approved balance." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("payout_requests")
    .insert({
      user_id: user.id,
      amount_cents: body.amountCents,
      bank_info_json: JSON.stringify(body.bankInfo),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}
