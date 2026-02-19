import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateMarketingCopy } from "@/lib/ai";
import { consumeAiCredit } from "@/lib/credits";
import { assertUnlockedByUserId } from "@/lib/auth";

const schema = z.object({
  productName: z.string().min(2),
  keySellingPoints: z.string().min(4),
  price: z.string().min(1),
  platform: z.enum(["FB", "IG", "TikTok", "WhatsApp"]),
  lang: z.enum(["en", "zh", "ms"]).default("en"),
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
    const bundle = await generateMarketingCopy(body);
    const prompt = `${body.productName}|${body.keySellingPoints}|${body.price}|${body.platform}`;
    const historyPayload = JSON.stringify({
      kind: "copy",
      input: {
        productName: body.productName,
        keySellingPoints: body.keySellingPoints,
        price: body.price,
        platform: body.platform,
        lang: body.lang,
      },
      bundle,
    });
    const credits = await consumeAiCredit({
      ownerId: user.id,
      type: "copy",
      prompt,
      shopId: body.shopId ?? null,
      resultUrl: historyPayload,
    });

    return NextResponse.json({ bundle, credits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate copy";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
