import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function AuthPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0B1F1A] px-6 py-10">
      <Card className="w-full max-w-md border-white/10 bg-[#112E27]">
        <p className="font-mono text-xs uppercase tracking-wide text-[#9CA3AF]">BazaarBah</p>
        <h1 className="mt-2 text-2xl font-bold text-[#F3F4F6]">Seller Access</h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Login via magic link to manage your digital bazaar.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </Card>
    </main>
  );
}
