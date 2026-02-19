import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { composePoster } from "@/lib/poster";
import { generateBackgroundImage } from "@/lib/ai";
import { consumeAiCredit } from "@/lib/credits";
import { assertUnlockedByUserId } from "@/lib/auth";
import { ensurePublicBucket } from "@/lib/storage";

const schema = z.object({
  productName: z.string().min(2),
  sellingPoint: z.string().max(180).optional(),
  priceLabel: z.string().min(1),
  cta: z.string().min(2).default("Order Now"),
  style: z.enum(["gold", "minimal", "cute"]).default("gold"),
  aspect: z.enum(["16:9", "9:16"]).default("9:16"),
  sourceImageUrl: z.string().url().optional(),
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

    let base64 = "";
    let prompt = "";
    let sourceKind: "uploaded_or_beautified" | "generated_background" = "generated_background";

    if (body.sourceImageUrl) {
      const sourceRes = await fetch(body.sourceImageUrl);
      if (!sourceRes.ok) {
        throw new Error("Failed to load source image for poster.");
      }
      const sourceBytes = Buffer.from(await sourceRes.arrayBuffer());
      base64 = sourceBytes.toString("base64");
      prompt = `poster-from-source|${body.productName}|${body.sellingPoint ?? ""}|${body.priceLabel}|${body.aspect}`;
      sourceKind = "uploaded_or_beautified";
    } else {
      const generated = await generateBackgroundImage({
        title: body.productName,
        description: body.sellingPoint,
        style: body.style,
        aspect: body.aspect,
      });
      base64 = generated.base64;
      prompt = generated.prompt;
      sourceKind = "generated_background";
    }

    const posterBase64 = await composePoster({
      bgBase64: base64,
      title: body.productName,
      subtitle: body.sellingPoint ?? "Fresh festive special",
      price: body.priceLabel,
      cta: body.cta,
      theme: body.style,
      aspect: body.aspect,
    });

    await ensurePublicBucket(admin, "ai-assets", 10 * 1024 * 1024);

    const posterPath = `${user.id}/poster-${Date.now()}.png`;
    const posterBytes = Buffer.from(posterBase64, "base64");
    const { error: posterUploadErr } = await admin.storage.from("ai-assets").upload(posterPath, posterBytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (posterUploadErr) {
      throw new Error(posterUploadErr.message);
    }
    const { data: posterPublic } = admin.storage.from("ai-assets").getPublicUrl(posterPath);

    const bgPath = `${user.id}/poster-bg-${Date.now()}.png`;
    const bgBytes = Buffer.from(base64, "base64");
    const { error: bgUploadErr } = await admin.storage.from("ai-assets").upload(bgPath, bgBytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (bgUploadErr) {
      throw new Error(bgUploadErr.message);
    }
    const { data: bgPublic } = admin.storage.from("ai-assets").getPublicUrl(bgPath);

    const historyPayload = JSON.stringify({
      kind: "poster",
      posterUrl: posterPublic.publicUrl,
      backgroundUrl: bgPublic.publicUrl,
      input: {
        productName: body.productName,
        sellingPoint: body.sellingPoint ?? "",
        priceLabel: body.priceLabel,
        cta: body.cta,
        aspect: body.aspect,
        style: body.style,
        sourceImageUrl: body.sourceImageUrl ?? null,
        sourceKind,
      },
    });

    const credits = await consumeAiCredit({
      ownerId: user.id,
      type: "poster",
      prompt,
      shopId: body.shopId ?? null,
      resultUrl: historyPayload,
    });

    return NextResponse.json({
      backgroundBase64: base64,
      posterBase64,
      backgroundUrl: bgPublic.publicUrl,
      posterUrl: posterPublic.publicUrl,
      credits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate poster";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
