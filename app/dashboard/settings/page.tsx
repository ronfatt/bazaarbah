import { Card } from "@/components/ui/card";
import { requireUnlockedSeller } from "@/lib/auth";

export default async function SettingsPage() {
  await requireUnlockedSeller();
  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold text-[#F3F4F6]">Settings</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Reserved for workspace and preference settings.</p>
      </Card>
    </section>
  );
}
