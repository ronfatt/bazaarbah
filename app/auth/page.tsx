import { LoginForm } from "@/components/auth/login-form";

export default function AuthPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#123F33_0%,#0B1F1A_70%)] text-bb-text">
      <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(#fff_0.6px,transparent_0.6px)] [background-size:7px_7px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-bb-ai/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-8 py-10 lg:grid-cols-[0.42fr_0.58fr]">
        <section className="flex flex-col justify-center">
          <p className="font-mono text-xs tracking-[0.18em] text-bb-muted">BAZAARBAH</p>
          <h1 className="mt-3 text-4xl font-bold">AI-Powered Digital Bazaar</h1>
          <p className="mt-3 text-sm text-bb-muted">Built for structured seller operations, not generic store pages.</p>

          <div className="mt-8 space-y-3 text-sm">
            <p className="rounded-xl border border-bb-border/10 bg-bb-surface/40 px-4 py-3">✔ 10-minute shop setup</p>
            <p className="rounded-xl border border-bb-border/10 bg-bb-surface/40 px-4 py-3">✔ AI marketing tools</p>
            <p className="rounded-xl border border-bb-border/10 bg-bb-surface/40 px-4 py-3">✔ Order tracking + receipt</p>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-bb-ai/10 bg-bb-surface/70 p-8 shadow-[0_0_40px_rgba(0,194,168,0.1)] backdrop-blur-xl">
            <p className="text-xs tracking-[0.16em] text-bb-muted">SELLER ACCESS</p>
            <h2 className="mt-2 text-3xl font-bold">Login</h2>
            <p className="mt-2 text-sm text-bb-muted">Use email + password. New user can register directly.</p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
