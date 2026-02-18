import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePosterBackground } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { consumeCredit } from "@/lib/credits";

const schema = z.object({
  prompt: z.string().min(12),
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
    const { prompt, shopId } = schema.parse(await req.json());
    const imageBase64 = await generatePosterBackground(prompt);
    const credits = await consumeCredit({ ownerId: user.id, type: "product_image", prompt, shopId: shopId ?? null });
    return NextResponse.json({ imageBase64, credits });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate image" }, { status: 400 });
  }
}
