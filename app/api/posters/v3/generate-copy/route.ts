import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertUnlockedByUserId } from "@/lib/auth";
import { consumePosterV3Credits } from "@/lib/poster-v3-credits";
import { generatePosterCopyV3 } from "@/lib/ai";

const schema = z.object({
  jobId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  productName: z.string().min(2).optional(),
  priceText: z.string().min(1),
  description: z.string().max(240).optional(),
  festival: z.enum(["generic", "ramadan", "raya", "cny", "deepavali", "christmas", "valentine", "birthday", "none"]).default("generic"),
  objective: z.enum(["flash_sale", "new_launch", "preorder", "limited", "bundle", "free_delivery", "whatsapp"]).default("flash_sale"),
  style: z.enum(["premium", "festive", "minimal", "retail", "cute"]).default("retail"),
  ratio: z.enum(["9:16", "1:1", "4:5"]).default("9:16"),
  locale: z.enum(["en", "ms", "zh"]).default("en"),
  shopName: z.string().max(120).optional(),
  whatsapp: z.string().max(40).optional(),
  orderLink: z.string().url().optional(),
  footer: z.string().max(160).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertUnlockedByUserId(user.id);
    const body = schema.parse(await req.json());
    const admin = createAdminClient();

    const { data: shops } = await admin.from("shops").select("id,shop_name,phone_whatsapp,slug").eq("owner_id", user.id);
    const ownShopIds = (shops ?? []).map((s) => s.id);

    if (body.shopId && !ownShopIds.includes(body.shopId)) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    let productName = body.productName ?? "";
    let description = body.description;
    let productId = body.productId ?? null;
    if (productId) {
      const { data: product } = await admin
        .from("products")
        .select("id,name,description,shop_id")
        .eq("id", productId)
        .in("shop_id", ownShopIds)
        .maybeSingle();
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      productName = product.name;
      description = description ?? product.description ?? undefined;
    }
    if (!productName.trim()) return NextResponse.json({ error: "Product name is required" }, { status: 400 });

    const linkedShop = shops?.find((s) => s.id === body.shopId) ?? shops?.[0];
    const generated = await generatePosterCopyV3({
      productName,
      priceText: body.priceText,
      description,
      festival: body.festival,
      objective: body.objective,
      style: body.style,
      locale: body.locale,
      shopName: body.shopName ?? linkedShop?.shop_name,
      whatsapp: body.whatsapp ?? linkedShop?.phone_whatsapp,
      orderLink: body.orderLink ?? (linkedShop?.slug ? `${req.nextUrl.origin}/s/${linkedShop.slug}` : undefined),
    });

    const prompt = `poster-v3-copy|${productName}|${body.priceText}|${body.festival}|${body.objective}|${body.style}|${body.locale}`;
    const credits = await consumePosterV3Credits({
      ownerId: user.id,
      shopId: body.shopId ?? linkedShop?.id ?? null,
      amount: 1,
      type: "copy",
      prompt,
      resultUrl: JSON.stringify({ kind: "poster_v3_copy", copy: generated }),
    });

    const payload = {
      user_id: user.id,
      shop_id: body.shopId ?? linkedShop?.id ?? null,
      product_id: productId,
      status: "draft",
      locale: body.locale,
      festival: body.festival,
      objective: body.objective,
      style: body.style,
      ratio: body.ratio,
      headline: generated.headline,
      subheadline: generated.subheadline ?? null,
      bullets_json: JSON.stringify(generated.bullets ?? []),
      cta: generated.cta,
      price_text: generated.priceText || body.priceText,
      footer: body.footer ?? generated.footer ?? null,
    };

    let jobId = body.jobId;
    if (jobId) {
      const { error: updateErr } = await admin.from("poster_jobs").update(payload).eq("id", jobId).eq("user_id", user.id);
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
    } else {
      const { data: created, error: createErr } = await admin.from("poster_jobs").insert(payload).select("id").single();
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });
      jobId = created.id;
    }

    return NextResponse.json({
      jobId,
      copy: generated,
      remainingCredits: credits.remaining,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate copy";
    const lower = message.toLowerCase();
    const status = lower.includes("upgrade required") ? 403 : lower.includes("no ai_credits") ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
