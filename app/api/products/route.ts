import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertUnlockedByUserId } from "@/lib/auth";

const bodySchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().max(400).optional(),
  priceCents: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
  imageOriginalUrl: z.string().url().optional(),
  imageEnhancedUrl: z.string().url().optional(),
  imageSource: z.enum(["original", "enhanced"]).optional(),
  enhancedMeta: z.record(z.string(), z.unknown()).optional(),
  isAvailable: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).optional(),
  soldOut: z.boolean().optional(),
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
    const body = bodySchema.parse(await req.json());
    const admin = createAdminClient();

    const { data: shop } = await admin.from("shops").select("id").eq("id", body.shopId).eq("owner_id", user.id).maybeSingle();
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const imageOriginalUrl = body.imageOriginalUrl ?? body.imageUrl ?? null;
    const imageEnhancedUrl = body.imageEnhancedUrl ?? null;
    const imageSource = body.imageSource ?? "original";
    const activeImageUrl =
      imageSource === "enhanced"
        ? imageEnhancedUrl ?? imageOriginalUrl
        : imageOriginalUrl ?? imageEnhancedUrl;

    const { data, error } = await admin
      .from("products")
      .insert({
        shop_id: body.shopId,
        name: body.name,
        description: body.description ?? null,
        price_cents: body.priceCents,
        image_url: activeImageUrl ?? null,
        image_original_url: imageOriginalUrl,
        image_enhanced_url: imageEnhancedUrl,
        image_source: imageSource,
        enhanced_at: imageEnhancedUrl ? new Date().toISOString() : null,
        enhanced_meta: body.enhancedMeta ?? null,
        is_available: body.isAvailable ?? true,
        track_stock: body.trackStock ?? false,
        stock_qty: body.stockQty ?? 0,
        sold_out: body.soldOut ?? ((body.trackStock ?? false) ? Number(body.stockQty ?? 0) <= 0 : false),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ product: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    const status = message.toLowerCase().includes("upgrade required") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
