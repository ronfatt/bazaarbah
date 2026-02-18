import { createAdminClient } from "@/lib/supabase/admin";
import { hasUnlockedFeatures } from "@/lib/plan";

type AiType = "copy" | "poster" | "product_image";

const creditColumnByType: Record<AiType, "copy_credits" | "poster_credits" | "image_credits"> = {
  copy: "copy_credits",
  poster: "poster_credits",
  product_image: "image_credits",
};

export async function consumeAiCredit(input: {
  ownerId: string;
  type: AiType;
  prompt: string;
  shopId?: string | null;
  resultUrl?: string | null;
}) {
  const admin = createAdminClient();

  const [profileRes, recentRes] = await Promise.all([
    admin.from("profiles").select("id,plan,plan_tier,copy_credits,poster_credits,image_credits").eq("id", input.ownerId).maybeSingle(),
    admin
      .from("ai_jobs")
      .select("id")
      .eq("owner_id", input.ownerId)
      .eq("type", input.type)
      .gte("created_at", new Date(Date.now() - 3000).toISOString())
      .limit(1),
  ]);

  if (!profileRes.data) {
    throw new Error("Profile not found");
  }

  if (!hasUnlockedFeatures(profileRes.data)) {
    throw new Error("Upgrade required. Free plan cannot use AI tools.");
  }

  if ((recentRes.data?.length ?? 0) > 0) {
    throw new Error("Too many requests. Please wait 3 seconds.");
  }

  const creditColumn = creditColumnByType[input.type];
  const creditsLeft = Number(profileRes.data[creditColumn]);
  if (creditsLeft <= 0) {
    throw new Error(`No ${creditColumn} left.`);
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ [creditColumn]: creditsLeft - 1 })
    .eq("id", input.ownerId)
    .eq(creditColumn, creditsLeft);

  if (profileErr) {
    throw new Error("Credit update failed, please retry.");
  }

  await admin.from("ai_jobs").insert({
    owner_id: input.ownerId,
    shop_id: input.shopId ?? null,
    type: input.type,
    prompt: input.prompt,
    result_url: input.resultUrl ?? null,
    credits_used: 1,
  });

  return {
    remaining: creditsLeft - 1,
  };
}
