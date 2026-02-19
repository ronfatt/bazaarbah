import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertUnlockedByUserId } from "@/lib/auth";
import { enhanceProductPhoto } from "@/lib/ai";
import { consumeAiCredit, getAiCreditCost } from "@/lib/credits";
import { ensurePublicBucket } from "@/lib/storage";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  productId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  originalImageUrl: z.string().url().optional(),
  productName: z.string().min(2).optional(),
  description: z.string().max(400).optional(),
  style: z.enum(["studio", "raya", "premium"]).default("studio"),
  outputSize: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional(),
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

    const cost = await getAiCreditCost("product_image");
    const { data: profile } = await admin.from("profiles").select("id,ai_credits").eq("id", user.id).maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if ((profile.ai_credits ?? 0) < cost) {
      return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }

    const { data: ownShops } = await admin.from("shops").select("id").eq("owner_id", user.id);
    const ownShopIds = ownShops?.map((s) => s.id) ?? [];

    let productId = body.productId ?? null;
    let shopId = body.shopId ?? null;
    let originalImageUrl = body.originalImageUrl ?? null;
    let productName = body.productName ?? "Product";
    let description = body.description ?? undefined;

    if (productId) {
      const { data: product } = await admin
        .from("products")
        .select("id,shop_id,name,description,image_original_url,image_url")
        .eq("id", productId)
        .in("shop_id", ownShopIds)
        .maybeSingle();

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      shopId = product.shop_id;
      originalImageUrl = product.image_original_url ?? product.image_url;
      productName = product.name;
      description = product.description ?? description;
    } else {
      if (!shopId || !ownShopIds.includes(shopId)) {
        return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      }
      if (!originalImageUrl) {
        return NextResponse.json({ error: "Original image is required" }, { status: 400 });
      }
      if (!body.productName) {
        return NextResponse.json({ error: "Product name is required" }, { status: 400 });
      }
    }

    if (!originalImageUrl) {
      return NextResponse.json({ error: "Original image is required" }, { status: 400 });
    }

    const imageRes = await fetch(originalImageUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ error: "Failed to fetch original image" }, { status: 400 });
    }

    const mimeType = imageRes.headers.get("content-type")?.split(";")[0] ?? "image/png";
    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    const imageBytes = new Uint8Array(await imageRes.arrayBuffer());
    if (imageBytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }

    const enhanced = await enhanceProductPhoto({
      imageBytes,
      mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp",
      productName,
      description,
      style: body.style,
      outputSize: body.outputSize,
    });

    const enhancedBytes = Buffer.from(enhanced.base64, "base64");
    await ensurePublicBucket(admin, "product-images", MAX_BYTES);
    const path = `${user.id}/enhanced-${productId ?? "draft"}-${Date.now()}.png`;

    const { error: uploadErr } = await admin.storage.from("product-images").upload(path, enhancedBytes, {
      contentType: "image/png",
      upsert: true,
    });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    }

    const { data: publicUrlData } = admin.storage.from("product-images").getPublicUrl(path);
    const imageEnhancedUrl = publicUrlData.publicUrl;

    const credits = await consumeAiCredit({
      ownerId: user.id,
      type: "product_image",
      prompt: enhanced.prompt,
      shopId,
      resultUrl: imageEnhancedUrl,
    });

    if (productId) {
      const { error: updateErr } = await admin
        .from("products")
        .update({
          image_enhanced_url: imageEnhancedUrl,
          enhanced_at: new Date().toISOString(),
          enhanced_meta: {
            style: body.style,
            model: enhanced.model,
            outputSize: body.outputSize ?? "1024x1024",
            promptVersion: "v1",
          },
        })
        .eq("id", productId)
        .in("shop_id", ownShopIds);

      if (updateErr) {
        await admin
          .from("profiles")
          .update({ ai_credits: credits.remaining + credits.cost })
          .eq("id", user.id)
          .eq("ai_credits", credits.remaining);
        return NextResponse.json({ error: "Failed to update product" }, { status: 400 });
      }
    }

    return NextResponse.json({ imageEnhancedUrl, remainingAiCredits: credits.remaining, cost: credits.cost });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI enhancement failed";
    const lower = message.toLowerCase();
    const status = lower.includes("upgrade required") ? 403 : lower.includes("no ai_credits") ? 402 : 400;
    return NextResponse.json({ error: message === "No ai_credits left." ? "INSUFFICIENT_CREDITS" : message }, { status });
  }
}
