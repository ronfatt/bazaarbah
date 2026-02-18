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
      <Card className="bg-gradient-to-br from-[#112E27] to-[#163C33]">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#00C2A8]/10 text-[#00C2A8] text-xs font-medium">AI Operations</span>
        <h1 className="mt-3 text-2xl font-bold text-[#F3F4F6]">AI Marketing Bundle</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Background/content by AI, typography by system for reliable output.</p>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
          <p className="rounded-lg border border-white/10 bg-[#112E27] px-3 py-2 text-[#F3F4F6]">Copy credits: {profile.copy_credits}</p>
          <p className="rounded-lg border border-white/10 bg-[#112E27] px-3 py-2 text-[#F3F4F6]">Image credits: {profile.image_credits}</p>
          <p className="rounded-lg border border-white/10 bg-[#112E27] px-3 py-2 text-[#F3F4F6]">Poster credits: {profile.poster_credits}</p>
        </div>
      </Card>

      <AITools shopId={shop?.id} initialTheme={shop?.theme ?? "gold"} />
    </section>
  );
}
