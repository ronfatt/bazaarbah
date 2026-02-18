import { LoginForm } from "@/components/auth/login-form";
import { Store, Wand2, ReceiptText } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_25%_30%,rgba(0,194,168,0.10),transparent_42%),radial-gradient(circle_at_80%_22%,rgba(201,162,39,0.09),transparent_40%),radial-gradient(circle_at_52%_55%,rgba(255,255,255,0.06),transparent_45%),#071A16] text-bb-text">
      <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(rgba(255,255,255,0.8)_0.55px,transparent_0.55px)] [background-size:7px_7px]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-8 py-10 lg:grid-cols-[0.42fr_0.58fr]">
        <section className="flex flex-col justify-center">
          <p className="font-mono text-xs tracking-[0.18em] text-bb-muted">BAZAARBAH</p>
          <h1 className="mt-3 text-4xl font-bold">AI-Powered Digital Bazaar</h1>
          <p className="mt-3 text-sm text-white/65">Built for structured seller operations, not generic store pages.</p>

          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-white/12 bg-white/5 p-4 backdrop-blur-xl hover:border-white/18 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-bb-ai" />
                  <p className="text-sm font-semibold">10-minute shop setup</p>
                </div>
                <span className="rounded-full border border-bb-ai/20 bg-bb-ai/10 px-2 py-0.5 text-[10px] text-bb-ai">Fast</span>
              </div>
              <p className="mt-1 text-xs text-white/45">Create a branded storefront and share link quickly.</p>
            </div>

            <div className="rounded-xl border border-white/12 bg-white/5 p-4 backdrop-blur-xl hover:border-white/18 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 size={16} className="text-bb-ai" />
                  <p className="text-sm font-semibold">AI marketing tools</p>
                </div>
                <span className="rounded-full border border-bb-ai/20 bg-bb-ai/10 px-2 py-0.5 text-[10px] text-bb-ai">AI</span>
              </div>
              <p className="mt-1 text-xs text-white/45">Generate poster, product background and copy bundle.</p>
            </div>

            <div className="rounded-xl border border-white/12 bg-white/5 p-4 backdrop-blur-xl hover:border-white/18 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptText size={16} className="text-bb-ai" />
                  <p className="text-sm font-semibold">Order + receipt flow</p>
                </div>
                <span className="rounded-full border border-bb-ai/20 bg-bb-ai/10 px-2 py-0.5 text-[10px] text-bb-ai">Ops</span>
              </div>
              <p className="mt-1 text-xs text-white/45">Track proof payment and issue receipt in one panel.</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/12 bg-bb-surface/70 p-8 shadow-[0_0_40px_rgba(0,194,168,0.1)] backdrop-blur-xl hover:border-white/18 transition">
            <p className="text-xs tracking-[0.16em] text-white/45">SELLER ACCESS</p>
            <h2 className="mt-2 text-3xl font-bold">Login</h2>
            <p className="mt-2 text-sm text-white/65">Use email + password. New user can register directly.</p>
            <div className="mt-6">
              <LoginForm />
            </div>
            <div className="mt-3">
              <Link href="/admin/auth" className="text-xs text-white/45 hover:text-bb-ai">
                Admin login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
