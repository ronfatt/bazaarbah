import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateMarketingCopy } from "@/lib/ai";
import { consumeAiCredit } from "@/lib/credits";
import { assertActiveSellerByUserId } from "@/lib/auth";

const schema = z.object({
  mode: z.enum(["full_bundle", "poster_fields"]).default("full_bundle"),
  productName: z.string().min(2),
  keySellingPoints: z.string().min(4).optional(),
  price: z.string().min(1),
  platform: z.enum(["FB", "IG", "TikTok", "WhatsApp"]).optional(),
  toneStyle: z.enum(["flash_sale", "raya_premium", "elegant_luxury", "bazaar_santai", "hard_selling"]).optional(),
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
    await assertActiveSellerByUserId(user.id);
    const body = schema.parse(await req.json());
    const result = await generateMarketingCopy(body);
    const prompt = `${body.mode}|${body.productName}|${body.keySellingPoints ?? "-"}|${body.price}|${body.platform ?? "-"}|${body.toneStyle ?? "-"}`;
    const historyPayload = JSON.stringify({
      kind: "copy",
      input: {
        mode: body.mode,
        productName: body.productName,
        keySellingPoints: body.keySellingPoints ?? "",
        price: body.price,
        platform: body.platform ?? "FB",
        toneStyle: body.toneStyle ?? null,
        lang: body.lang,
      },
      ...(body.mode === "poster_fields" ? { posterFields: result } : { bundle: result }),
    });
    const credits = await consumeAiCredit({
      ownerId: user.id,
      type: "copy",
      prompt,
      shopId: body.shopId ?? null,
      resultUrl: historyPayload,
    });

    if (body.mode === "poster_fields") {
      return NextResponse.json({ posterFields: result, credits });
    }
    return NextResponse.json({ bundle: result, credits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate copy";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
