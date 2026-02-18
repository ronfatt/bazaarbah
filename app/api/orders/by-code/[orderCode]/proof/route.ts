import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  proofImageUrl: z.string().url().optional(),
  referenceText: z.string().max(120).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderCode: string }> }) {
  const { orderCode } = await params;

  try {
    const body = schema.parse(await req.json());
    const admin = createAdminClient();

    const { data: order } = await admin.from("orders").select("id").eq("order_code", orderCode).maybeSingle();
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { error } = await admin.from("payments").insert({
      order_id: order.id,
      method: "qr_manual",
      proof_image_url: body.proofImageUrl ?? null,
      reference_text: body.referenceText ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.from("orders").update({ status: "proof_submitted" }).eq("id", order.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid payload" }, { status: 400 });
  }
}
