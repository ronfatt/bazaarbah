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
        <h1 className="text-2xl font-bold text-[#F3F4F6]">Shop Profile</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Manage name, slug, theme, WhatsApp and branding.</p>
        <div className="mt-6">
          <ShopForm initialShop={shop} />
        </div>
      </Card>
    </section>
  );
}
