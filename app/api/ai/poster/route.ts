import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { composePoster } from "@/lib/poster";
import { generateBackgroundImage } from "@/lib/ai";
import { consumeAiCredit } from "@/lib/credits";
import { assertUnlockedByUserId } from "@/lib/auth";

const schema = z.object({
  productName: z.string().min(2),
  sellingPoint: z.string().max(180).optional(),
  priceLabel: z.string().min(1),
  cta: z.string().min(2).default("Order Now"),
  style: z.enum(["gold", "minimal", "cute"]).default("gold"),
  aspect: z.enum(["16:9", "9:16"]).default("9:16"),
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
    await assertUnlockedByUserId(user.id);
    const body = schema.parse(await req.json());

    const { base64, prompt } = await generateBackgroundImage({
      title: body.productName,
      description: body.sellingPoint,
      style: body.style,
      aspect: body.aspect,
    });

    const posterBase64 = await composePoster({
      bgBase64: base64,
      title: body.productName,
      subtitle: body.sellingPoint ?? "Fresh festive special",
      price: body.priceLabel,
      cta: body.cta,
      theme: body.style,
      aspect: body.aspect,
    });

    const credits = await consumeAiCredit({ ownerId: user.id, type: "poster", prompt, shopId: body.shopId ?? null });

    return NextResponse.json({ backgroundBase64: base64, posterBase64, credits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate poster";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
