import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  proofImageUrl: z.string().url().optional(),
  referenceText: z.string().max(120).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderCode: string }> }) {
  const { orderCode } = await params;

  try {
    const body = schema.parse(await req.json());
    const supabase = await createClient();

    const { error } = await supabase.rpc("submit_payment_proof_public", {
      p_order_code: orderCode,
      p_reference_text: body.referenceText ?? null,
      p_proof_image_url: body.proofImageUrl ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }
}
