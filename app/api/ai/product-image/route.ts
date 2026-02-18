import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateBackgroundImage } from "@/lib/ai";
import { consumeAiCredit } from "@/lib/credits";

const schema = z.object({
  productName: z.string().min(2),
  description: z.string().max(240).optional(),
  style: z.enum(["gold", "minimal", "cute"]).default("gold"),
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
    const { base64, prompt } = await generateBackgroundImage({
      title: body.productName,
      description: body.description,
      style: body.style,
      aspect: "9:16",
    });

    const credits = await consumeAiCredit({ ownerId: user.id, type: "product_image", prompt, shopId: body.shopId ?? null });

    return NextResponse.json({ imageBase64: base64, credits });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate product background" }, { status: 400 });
  }
}
