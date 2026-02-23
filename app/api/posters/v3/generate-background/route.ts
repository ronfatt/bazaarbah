import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertActiveSellerByUserId } from "@/lib/auth";
import { consumePosterV3Credits } from "@/lib/poster-v3-credits";
import { ensurePublicBucket } from "@/lib/storage";
import { generatePosterBackgroundV3 } from "@/lib/ai";

const schema = z.object({
  jobId: z.string().uuid(),
  force: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertActiveSellerByUserId(user.id);
    const body = schema.parse(await req.json());
    const admin = createAdminClient();

    const { data: job } = await admin
      .from("poster_jobs")
      .select("id,user_id,shop_id,product_id,headline,subheadline,price_text,festival,objective,style,ratio,background_url,status")
      .eq("id", body.jobId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!job) return NextResponse.json({ error: "Poster job not found" }, { status: 404 });

    if (job.background_url && !body.force) {
      return NextResponse.json({ jobId: job.id, backgroundUrl: job.background_url, skipped: true });
    }

    let productName = job.headline || "Raya Product";
    let description = job.subheadline ?? undefined;
    if (job.product_id) {
      const { data: product } = await admin.from("products").select("name,description").eq("id", job.product_id).maybeSingle();
      if (product?.name) productName = product.name;
      if (product?.description) description = description ?? product.description;
    }

    const generated = await generatePosterBackgroundV3({
      productName,
      description,
      festival: job.festival,
      objective: job.objective,
      style: job.style,
      ratio: job.ratio,
    });

    const bytes = Buffer.from(generated.base64, "base64");
    await ensurePublicBucket(admin, "ai-assets", 10 * 1024 * 1024);
    const path = `${user.id}/poster-v3-bg-${job.id}-${Date.now()}.png`;
    const { error: uploadErr } = await admin.storage.from("ai-assets").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (uploadErr) throw new Error(uploadErr.message);
    const { data: publicData } = admin.storage.from("ai-assets").getPublicUrl(path);

    const credits = await consumePosterV3Credits({
      ownerId: user.id,
      shopId: job.shop_id,
      amount: 2,
      type: "product_image",
      prompt: generated.prompt,
      resultUrl: publicData.publicUrl,
    });

    const { error: updateErr } = await admin
      .from("poster_jobs")
      .update({
        status: "running",
        background_url: publicData.publicUrl,
      })
      .eq("id", job.id)
      .eq("user_id", user.id);
    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({
      jobId: job.id,
      backgroundUrl: publicData.publicUrl,
      remainingCredits: credits.remaining,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate background";
    const lower = message.toLowerCase();
    const status = lower.includes("upgrade required") ? 403 : lower.includes("no ai_credits") ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
