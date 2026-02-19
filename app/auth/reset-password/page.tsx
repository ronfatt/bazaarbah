import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_25%_30%,rgba(0,194,168,0.10),transparent_42%),radial-gradient(circle_at_80%_22%,rgba(201,162,39,0.09),transparent_40%),radial-gradient(circle_at_52%_55%,rgba(255,255,255,0.06),transparent_45%),#071A16] text-bb-text">
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-8 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-white/12 bg-bb-surface/70 p-8 shadow-[0_0_40px_rgba(0,194,168,0.1)] backdrop-blur-xl">
          <p className="text-xs tracking-[0.16em] text-white/45">SELLER ACCESS</p>
          <h1 className="mt-2 text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-sm text-white/65">Enter your new password to continue.</p>

          <div className="mt-6">
            <ResetPasswordForm />
          </div>

          <div className="mt-4">
            <Link href="/auth" className="text-xs text-white/45 hover:text-bb-ai">
              Back to login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
