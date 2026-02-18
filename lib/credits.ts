import { createAdminClient } from "@/lib/supabase/admin";

type AiType = "copy" | "poster" | "product_image";

const dailyLimitByPlan: Record<string, Record<AiType, number>> = {
  basic: { poster: 5, product_image: 10, copy: 50 },
  pro: { poster: 30, product_image: 80, copy: 300 },
};

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

  const [profileRes, recentRes, todayRes] = await Promise.all([
    admin.from("profiles").select("id,plan,copy_credits,poster_credits,image_credits").eq("id", input.ownerId).maybeSingle(),
    admin
      .from("ai_jobs")
      .select("id")
      .eq("owner_id", input.ownerId)
      .eq("type", input.type)
      .gte("created_at", new Date(Date.now() - 3000).toISOString())
      .limit(1),
    admin
      .from("ai_jobs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", input.ownerId)
      .eq("type", input.type)
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  if (!profileRes.data) {
    throw new Error("Profile not found");
  }

  if ((recentRes.data?.length ?? 0) > 0) {
    throw new Error("Too many requests. Please wait 3 seconds.");
  }

  const plan = profileRes.data.plan ?? "basic";
  const limit = dailyLimitByPlan[plan]?.[input.type] ?? dailyLimitByPlan.basic[input.type];
  const usedToday = todayRes.count ?? 0;
  if (usedToday >= limit) {
    throw new Error(`Daily limit reached for ${input.type}.`);
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
    usedToday: usedToday + 1,
    dailyLimit: limit,
  };
}
