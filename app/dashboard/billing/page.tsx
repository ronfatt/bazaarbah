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
        <h1 className="text-2xl font-bold text-[#F3F4F6]">Billing & Credits</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Plan status, remaining credits, and daily request caps.</p>
      </Card>

      <Card>
        <p className="text-sm text-[#9CA3AF]">Current Plan</p>
        <p className="mt-1 text-xl font-semibold uppercase text-[#F3F4F6]">{plan}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm text-[#F3F4F6]">Copy credits: {profile.copy_credits}</div>
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm text-[#F3F4F6]">Image credits: {profile.image_credits}</div>
          <div className="rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm text-[#F3F4F6]">Poster credits: {profile.poster_credits}</div>
        </div>

        <div className="mt-4 rounded-xl border border-[#C9A227]/50 bg-[#C9A227]/10 p-3 text-sm text-[#F3F4F6]">
          Daily cap: poster {cap.poster}, image {cap.image}, copy {cap.copy}
        </div>

        <button className="mt-4 rounded-xl bg-[#C9A227] px-6 py-2 text-sm font-semibold text-black hover:bg-[#D4AF37]">Top-up Credits (Coming Soon)</button>
      </Card>
    </section>
  );
}
