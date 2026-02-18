import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";

export default async function Home() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  } catch {
    // Keep welcome page available even if auth bootstrap is temporarily unavailable.
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_40%,#123F33_0%,#0B1F1A_70%)] text-bb-text">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] [background-image:radial-gradient(#fff_0.6px,transparent_0.6px)] [background-size:7px_7px]" />

      <div className="relative px-8 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-bb-muted">BAZAARBAH</p>
            <p className="mt-1 text-sm text-bb-muted">AI-Powered Digital Bazaar</p>
          </div>
          <Link href="/auth">
            <AppButton variant="secondary">Login</AppButton>
          </Link>
        </header>

        <section className="mx-auto mt-20 grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-bb-ai/20 bg-bb-ai/10 px-3 py-1 text-xs font-medium text-bb-ai">
              <Sparkles size={13} /> Modern Digital Bazaar + AI Ops
            </p>
            <h1 className="text-5xl font-bold leading-tight">Operate Raya Sales Like a Real SaaS Team</h1>
            <p className="max-w-2xl text-lg text-bb-muted">Run shop setup, order tracking, receipt workflow, and AI marketing from one dark-mode control center.</p>
            <div className="space-y-3 pt-2 text-sm text-bb-text">
              <p className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-bb-ai" /> 10-minute shop setup</p>
              <p className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-bb-ai" /> AI marketing tools</p>
              <p className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-bb-ai" /> Order tracking + receipt</p>
            </div>
          </div>

          <AppCard className="p-8 bg-bb-surface/55 border-bb-ai/10 shadow-glowAI">
            <h2 className="text-2xl font-bold">Welcome Screen</h2>
            <p className="mt-2 text-sm text-bb-muted">This is your product-first entry, not a marketing landing page. Login when ready to manage operations.</p>
            <div className="mt-6 flex gap-3">
              <Link href="/auth">
                <AppButton variant="primary" size="lg">Go to Login</AppButton>
              </Link>
              <Link href="/s/demo">
                <AppButton variant="secondary" size="lg">View Demo Storefront</AppButton>
              </Link>
            </div>
          </AppCard>
        </section>
      </div>
    </main>
  );
}
