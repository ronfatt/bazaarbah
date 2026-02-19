import { createAdminClient } from "@/lib/supabase/admin";
import { hasUnlockedFeatures } from "@/lib/plan";

type AiType = "copy" | "poster" | "product_image";

export async function getAiCreditCost(type: AiType) {
  const admin = createAdminClient();
  const { data } = await admin.from("ai_credit_costs").select("cost").eq("ai_type", type).maybeSingle();
  return Number(data?.cost ?? 1);
}

export async function consumeAiCredit(input: {
  ownerId: string;
  type: AiType;
  prompt: string;
  shopId?: string | null;
  resultUrl?: string | null;
}) {
  const admin = createAdminClient();
  const cost = await getAiCreditCost(input.type);

  const [profileRes, recentRes] = await Promise.all([
    admin.from("profiles").select("id,plan,plan_tier,ai_credits").eq("id", input.ownerId).maybeSingle(),
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

  const creditsLeft = Number(profileRes.data.ai_credits ?? 0);
  if (creditsLeft < cost) {
    throw new Error("No ai_credits left.");
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ ai_credits: creditsLeft - cost })
    .eq("id", input.ownerId)
    .eq("ai_credits", creditsLeft);

  if (profileErr) {
    throw new Error("Credit update failed, please retry.");
  }

  await admin.from("ai_jobs").insert({
    owner_id: input.ownerId,
    shop_id: input.shopId ?? null,
    type: input.type,
    prompt: input.prompt,
    result_url: input.resultUrl ?? null,
    credits_used: cost,
  });

  return {
    remaining: creditsLeft - cost,
    cost,
  };
}
