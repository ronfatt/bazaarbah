import { Card } from "@/components/ui/card";
import { AITools } from "@/components/dashboard/ai-tools";
import { requireSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AIPage() {
  const { user, profile } = await requireSeller();
  const admin = createAdminClient();

  const { data: shop } = await admin.from("shops").select("id").eq("owner_id", user.id).order("created_at", { ascending: true }).maybeSingle();

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold">AI Tools</h1>
        <p className="mt-2 text-sm text-neutral-600">Use credits to generate copy, product visuals, and promo posters.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <p className="rounded-lg bg-neutral-100 px-3 py-1">Copy: {profile.copy_credits}</p>
          <p className="rounded-lg bg-neutral-100 px-3 py-1">Image: {profile.image_credits}</p>
          <p className="rounded-lg bg-neutral-100 px-3 py-1">Poster: {profile.poster_credits}</p>
        </div>
      </Card>

      <AITools shopId={shop?.id} />
    </section>
  );
}
