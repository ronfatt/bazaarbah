import { createAdminClient } from "@/lib/supabase/admin";
import { hasUnlockedFeatures } from "@/lib/plan";

type LogType = "copy" | "product_image" | "poster";

export async function consumePosterV3Credits(input: {
  ownerId: string;
  shopId?: string | null;
  amount: number;
  type: LogType;
  prompt: string;
  resultUrl?: string | null;
}) {
  const admin = createAdminClient();
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

  if (!profileRes.data) throw new Error("Profile not found");
  if (!hasUnlockedFeatures(profileRes.data)) throw new Error("Upgrade required. Free plan cannot use AI tools.");
  if ((recentRes.data?.length ?? 0) > 0) throw new Error("Too many requests. Please wait 3 seconds.");

  const creditsLeft = Number(profileRes.data.ai_credits ?? 0);
  if (creditsLeft < input.amount) throw new Error("No ai_credits left.");

  const { error: updateErr } = await admin
    .from("profiles")
    .update({ ai_credits: creditsLeft - input.amount })
    .eq("id", input.ownerId)
    .eq("ai_credits", creditsLeft);
  if (updateErr) throw new Error("Credit update failed, please retry.");

  await admin.from("ai_jobs").insert({
    owner_id: input.ownerId,
    shop_id: input.shopId ?? null,
    type: input.type,
    prompt: input.prompt,
    result_url: input.resultUrl ?? null,
    credits_used: input.amount,
  });

  return { remaining: creditsLeft - input.amount, used: input.amount };
}
