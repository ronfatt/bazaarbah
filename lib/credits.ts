import { createAdminClient } from "@/lib/supabase/admin";

export async function consumeCredit(input: {
  ownerId: string;
  type: "copy" | "poster" | "product_image";
  prompt: string;
  resultUrl?: string | null;
  shopId?: string | null;
}) {
  const admin = createAdminClient();
  const column = input.type === "copy" ? "copy_credits" : input.type === "poster" ? "poster_credits" : "image_credits";

  const { data: profile } = await admin.from("profiles").select(`id,${column}`).eq("id", input.ownerId).maybeSingle();
  if (!profile) {
    throw new Error("Profile not found");
  }

  const current = Number((profile as Record<string, unknown>)[column] ?? 0);
  if (current <= 0) {
    throw new Error(`No ${column} left`);
  }

  await admin.from("profiles").update({ [column]: current - 1 }).eq("id", input.ownerId);
  await admin.from("ai_jobs").insert({
    owner_id: input.ownerId,
    shop_id: input.shopId ?? null,
    type: input.type,
    prompt: input.prompt,
    result_url: input.resultUrl ?? null,
    credits_used: 1,
  });

  return { remaining: current - 1 };
}
