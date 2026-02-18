import { Card } from "@/components/ui/card";
import { AITools } from "@/components/dashboard/ai-tools";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AIPage() {
  const { user, profile } = await requireSeller();
  const admin = createAdminClient();

  const { data: shop } = await admin.from("shops").select("id,theme").eq("owner_id", user.id).order("created_at", { ascending: true }).maybeSingle();

  return (
    <section className="space-y-4">
      <Card className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-neutral-100">
        <h1 className="text-2xl font-bold">AI Marketing Bundle</h1>
        <p className="mt-2 text-sm text-neutral-300">Text-safe poster pipeline: AI creates visuals, system handles typography.</p>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
          <p className="rounded-lg border border-neutral-700 bg-neutral-900/70 px-3 py-2">Copy credits: {profile.copy_credits}</p>
          <p className="rounded-lg border border-neutral-700 bg-neutral-900/70 px-3 py-2">Image credits: {profile.image_credits}</p>
          <p className="rounded-lg border border-neutral-700 bg-neutral-900/70 px-3 py-2">Poster credits: {profile.poster_credits}</p>
        </div>
      </Card>

      <AITools shopId={shop?.id} initialTheme={shop?.theme ?? "gold"} />
    </section>
  );
}
