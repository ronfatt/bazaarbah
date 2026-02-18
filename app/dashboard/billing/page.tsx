import { Card } from "@/components/ui/card";
import { requireSeller } from "@/lib/auth";

export default async function BillingPage() {
  const { profile } = await requireSeller();

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-2 text-sm text-neutral-600">Plan and credit usage. Top-up UI is static in MVP.</p>
      </Card>

      <Card>
        <p className="text-sm text-neutral-500">Current Plan</p>
        <p className="mt-1 text-xl font-semibold uppercase">{profile.plan}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-neutral-100 p-3 text-sm">Copy credits: {profile.copy_credits}</div>
          <div className="rounded-xl bg-neutral-100 p-3 text-sm">Image credits: {profile.image_credits}</div>
          <div className="rounded-xl bg-neutral-100 p-3 text-sm">Poster credits: {profile.poster_credits}</div>
        </div>

        <button className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950">Top-up Credits (Coming Soon)</button>
      </Card>
    </section>
  );
}
