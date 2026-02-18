import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateProductDescription } from "@/lib/ai";
import { consumeAiCredit } from "@/lib/credits";
import { assertUnlockedByUserId } from "@/lib/auth";

const schema = z.object({
  productName: z.string().min(2),
  price: z.string().min(1).optional(),
  keySellingPoints: z.string().max(300).optional(),
  shopId: z.string().uuid().optional(),
  lang: z.enum(["en", "zh", "ms"]).default("en"),
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
    const description = await generateProductDescription({
      productName: body.productName,
      price: body.price,
      keySellingPoints: body.keySellingPoints,
      lang: body.lang,
    });
    const prompt = `${body.productName}|${body.price ?? ""}|${body.keySellingPoints ?? ""}`;
    const credits = await consumeAiCredit({
      ownerId: user.id,
      type: "copy",
      prompt,
      shopId: body.shopId ?? null,
    });

    return NextResponse.json({ description, credits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate description";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
