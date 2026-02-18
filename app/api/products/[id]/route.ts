import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertUnlockedByUserId } from "@/lib/auth";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(400).nullable().optional(),
  priceCents: z.number().int().min(0).optional(),
  imageUrl: z.string().url().nullable().optional(),
  imageOriginalUrl: z.string().url().nullable().optional(),
  imageEnhancedUrl: z.string().url().nullable().optional(),
  imageSource: z.enum(["original", "enhanced"]).optional(),
  enhancedMeta: z.record(z.string(), z.unknown()).nullable().optional(),
  isAvailable: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertUnlockedByUserId(user.id);
    const body = patchSchema.parse(await req.json());
    const admin = createAdminClient();

    const { data: ownShops } = await admin.from("shops").select("id").eq("owner_id", user.id);
    const ownShopIds = ownShops?.map((s) => s.id) ?? [];

    const { data: current } = await admin
      .from("products")
      .select("id,image_url,image_original_url,image_enhanced_url,image_source")
      .eq("id", id)
      .in("shop_id", ownShopIds)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.priceCents !== undefined) patch.price_cents = body.priceCents;
    if (body.imageUrl !== undefined) patch.image_url = body.imageUrl;
    if (body.imageOriginalUrl !== undefined) patch.image_original_url = body.imageOriginalUrl;
    if (body.imageEnhancedUrl !== undefined) patch.image_enhanced_url = body.imageEnhancedUrl;
    if (body.imageSource !== undefined) patch.image_source = body.imageSource;
    if (body.enhancedMeta !== undefined) patch.enhanced_meta = body.enhancedMeta;
    if (body.isAvailable !== undefined) patch.is_available = body.isAvailable;

    const nextOriginal = body.imageOriginalUrl !== undefined ? body.imageOriginalUrl : current.image_original_url ?? current.image_url;
    const nextEnhanced = body.imageEnhancedUrl !== undefined ? body.imageEnhancedUrl : current.image_enhanced_url;
    const nextSource = body.imageSource ?? current.image_source ?? "original";
    const nextImageUrl =
      body.imageUrl !== undefined
        ? body.imageUrl
        : nextSource === "enhanced"
          ? nextEnhanced ?? nextOriginal ?? null
          : nextOriginal ?? nextEnhanced ?? null;

    patch.image_url = nextImageUrl;
    if (body.imageEnhancedUrl !== undefined && body.imageEnhancedUrl) {
      patch.enhanced_at = new Date().toISOString();
    }

    const { data, error } = await admin.from("products").update(patch).eq("id", id).in("shop_id", ownShopIds).select("*").single();

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

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    await assertUnlockedByUserId(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan upgrade required";
    return NextResponse.json({ error: message }, { status: 403 });
  }
  const { data: ownShops } = await admin.from("shops").select("id").eq("owner_id", user.id);
  const ownShopIds = ownShops?.map((s) => s.id) ?? [];

  const { error } = await admin.from("products").delete().eq("id", id).in("shop_id", ownShopIds);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
