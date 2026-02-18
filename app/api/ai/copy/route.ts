import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAdCopy } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { consumeCredit } from "@/lib/credits";

const schema = z.object({
  storeName: z.string().min(2),
  productName: z.string().min(2),
  productDescription: z.string().min(2),
  price: z.string().min(1),
  shopId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    const copy = await generateAdCopy(body);
    const prompt = `${body.storeName} | ${body.productName} | ${body.productDescription} | ${body.price}`;
    const credits = await consumeCredit({ ownerId: user.id, type: "copy", prompt, shopId: body.shopId ?? null });
    return NextResponse.json({ copy, credits });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate copy" }, { status: 400 });
  }
}
