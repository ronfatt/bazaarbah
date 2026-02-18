import { Card } from "@/components/ui/card";
import { ShopForm } from "@/components/dashboard/shop-form";
import { requireUnlockedSeller } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ShopPage() {
  const { user } = await requireUnlockedSeller();
  const admin = createAdminClient();

  const { data: shops } = await admin.from("shops").select("*").eq("owner_id", user.id).order("created_at", { ascending: true });
  const shop = shops?.[0] ?? null;

  return (
    <section className="space-y-4">
      <Card>
        <p className="text-xs uppercase tracking-wider text-white/45">Step 1 of 3</p>
        <p className="mt-2 text-sm text-white/65">1) Shop Info {"->"} 2) Add Products {"->"} 3) Share Your Link</p>
        <h1 className="mt-4 text-2xl font-bold text-[#F3F4F6]">Set Up Your Shop</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Tell us about your shop so customers can place orders easily.</p>
        <p className="mt-1 text-xs text-white/45">You only need to do this once.</p>
        <div className="mt-4 rounded-xl border border-bb-ai/15 bg-bb-ai/10 p-3 text-sm text-white/80">Don&apos;t worry - you can edit everything later.</div>
        <div className="mt-6">
          <ShopForm initialShop={shop} />
        </div>
      </Card>
    </section>
  );
}
