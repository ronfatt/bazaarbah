import { Card } from "@/components/ui/card";
import { requireSeller } from "@/lib/auth";

const dailyCaps = {
  basic: { poster: 5, image: 10, copy: 50 },
  pro: { poster: 30, image: 80, copy: 300 },
};

export default async function BillingPage() {
  const { profile } = await requireSeller();
  const plan = (profile.plan === "pro" ? "pro" : "basic") as "basic" | "pro";
  const cap = dailyCaps[plan];

  return (
    <section className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold">Billing & Credits</h1>
        <p className="mt-2 text-sm text-neutral-600">Top-up remains static for MVP. Credit and daily caps are enforced server-side.</p>
      </Card>

      <Card>
        <p className="text-sm text-neutral-500">Current Plan</p>
        <p className="mt-1 text-xl font-semibold uppercase">{plan}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-neutral-100 p-3 text-sm">Copy credits: {profile.copy_credits}</div>
          <div className="rounded-xl bg-neutral-100 p-3 text-sm">Image credits: {profile.image_credits}</div>
          <div className="rounded-xl bg-neutral-100 p-3 text-sm">Poster credits: {profile.poster_credits}</div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Daily cap: poster {cap.poster}, image {cap.image}, copy {cap.copy}
        </div>

        <button className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950">Top-up Credits (Coming Soon)</button>
      </Card>
    </section>
  );
}
