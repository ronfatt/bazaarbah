import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBackgroundImage } from "@/lib/ai";
import { consumeAiCredit } from "@/lib/credits";
import { assertUnlockedByUserId } from "@/lib/auth";
import { ensurePublicBucket } from "@/lib/storage";

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
    await assertUnlockedByUserId(user.id);
    const body = schema.parse(await req.json());
    const admin = createAdminClient();
    const { base64, prompt } = await generateBackgroundImage({
      title: body.productName,
      description: body.description,
      style: body.style,
      aspect: "9:16",
    });

    const bytes = Buffer.from(base64, "base64");
    await ensurePublicBucket(admin, "ai-assets", 10 * 1024 * 1024);
    const path = `${user.id}/background-${Date.now()}.png`;
    const { error: uploadErr } = await admin.storage.from("ai-assets").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (uploadErr) {
      throw new Error(uploadErr.message);
    }
    const { data: publicData } = admin.storage.from("ai-assets").getPublicUrl(path);
    const imageUrl = publicData.publicUrl;

    const historyPayload = JSON.stringify({
      kind: "product_image",
      imageUrl,
      input: {
        productName: body.productName,
        description: body.description ?? "",
        style: body.style,
      },
    });

    const credits = await consumeAiCredit({
      ownerId: user.id,
      type: "product_image",
      prompt,
      shopId: body.shopId ?? null,
      resultUrl: historyPayload,
    });

    return NextResponse.json({ imageBase64: base64, imageUrl, credits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate product background";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
