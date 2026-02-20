import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertUnlockedByUserId } from "@/lib/auth";
import { consumePosterV3Credits } from "@/lib/poster-v3-credits";
import { ensurePublicBucket } from "@/lib/storage";
import { choosePosterPreset, renderPosterV3, type PosterStyle } from "@/lib/poster-v3";
import type { PosterPresetName, PosterRatio } from "@/lib/poster-presets";

const schema = z.object({
  jobId: z.string().uuid(),
  headline: z.string().min(2).optional(),
  subheadline: z.string().max(120).optional(),
  bullets: z.array(z.string().max(80)).max(3).optional(),
  cta: z.string().min(2).max(30).optional(),
  priceText: z.string().min(1).optional(),
  footer: z.string().max(160).optional(),
  shuffleTemplate: z.boolean().optional(),
  preset: z.enum(["retail_badge", "hero_center", "split_panel", "premium_editorial", "cta_stripe", "diagonal_energy"]).optional(),
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

    const { data: job } = await admin
      .from("poster_jobs")
      .select("*")
      .eq("id", body.jobId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!job) return NextResponse.json({ error: "Poster job not found" }, { status: 404 });
    if (!job.background_url) return NextResponse.json({ error: "Background missing. Generate background first." }, { status: 400 });

    const headline = body.headline ?? job.headline ?? "";
    const cta = body.cta ?? job.cta ?? "Order Now";
    const priceText = body.priceText ?? job.price_text ?? "MYR 0.00";
    if (!headline.trim()) return NextResponse.json({ error: "Headline is required" }, { status: 400 });

    const bullets = body.bullets ?? (() => {
      try {
        const parsed = JSON.parse(job.bullets_json ?? "[]");
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
      } catch {
        return [];
      }
    })();

    const bgRes = await fetch(job.background_url);
    if (!bgRes.ok) return NextResponse.json({ error: "Failed to load background image" }, { status: 400 });
    const bgBuffer = Buffer.from(await bgRes.arrayBuffer());

    let heroImageBuffer: Buffer | undefined;
    if (job.product_id) {
      const { data: product } = await admin
        .from("products")
        .select("image_source,image_original_url,image_enhanced_url,image_url")
        .eq("id", job.product_id)
        .maybeSingle();
      const heroUrl =
        product?.image_source === "enhanced"
          ? product?.image_enhanced_url ?? product?.image_original_url ?? product?.image_url
          : product?.image_original_url ?? product?.image_url ?? product?.image_enhanced_url;
      if (heroUrl) {
        const heroRes = await fetch(heroUrl);
        if (heroRes.ok) {
          heroImageBuffer = Buffer.from(await heroRes.arrayBuffer());
        }
      }
    }

    let currentPreset: PosterPresetName | null = null;
    try {
      const parsed = JSON.parse(job.layout_json ?? "{}") as { preset?: PosterPresetName };
      currentPreset = parsed.preset ?? null;
    } catch {
      currentPreset = null;
    }
    const preset = body.preset ??
      choosePosterPreset({
        ratio: job.ratio as PosterRatio,
        style: job.style as PosterStyle,
        festival: job.festival,
        objective: job.objective,
        shuffle: body.shuffleTemplate ?? false,
        currentPreset,
      });

    const rendered = await renderPosterV3({
      ratio: job.ratio as PosterRatio,
      preset,
      backgroundBuffer: bgBuffer,
      headline,
      subheadline: body.subheadline ?? job.subheadline ?? "",
      bullets,
      cta,
      priceText,
      footer: body.footer ?? job.footer ?? "",
      style: job.style as PosterStyle,
      festival: job.festival,
      heroImageBuffer,
    });

    await ensurePublicBucket(admin, "ai-assets", 10 * 1024 * 1024);
    const path = `${user.id}/poster-v3-final-${job.id}-${Date.now()}.png`;
    const { error: uploadErr } = await admin.storage.from("ai-assets").upload(path, rendered.buffer, {
      contentType: "image/png",
      upsert: true,
    });
    if (uploadErr) throw new Error(uploadErr.message);
    const { data: publicData } = admin.storage.from("ai-assets").getPublicUrl(path);

    const credits = await consumePosterV3Credits({
      ownerId: user.id,
      shopId: job.shop_id,
      amount: 2,
      type: "poster",
      prompt: `poster-v3-render|${job.festival}|${job.objective}|${job.style}|${job.ratio}|${preset}`,
      resultUrl: publicData.publicUrl,
    });

    const layoutJson = JSON.stringify({ preset: rendered.preset, layout: rendered.layout });
    const { error: updateErr } = await admin
      .from("poster_jobs")
      .update({
        status: "done",
        headline,
        subheadline: body.subheadline ?? job.subheadline ?? null,
        bullets_json: JSON.stringify(bullets),
        cta,
        price_text: priceText,
        footer: body.footer ?? job.footer ?? null,
        final_poster_url: publicData.publicUrl,
        layout_json: layoutJson,
      })
      .eq("id", job.id)
      .eq("user_id", user.id);
    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({
      jobId: job.id,
      finalPosterUrl: publicData.publicUrl,
      layoutJson,
      preset: rendered.preset,
      remainingCredits: credits.remaining,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render poster";
    const lower = message.toLowerCase();
    const status = lower.includes("upgrade required") ? 403 : lower.includes("no ai_credits") ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
