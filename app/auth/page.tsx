import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function AuthPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-10">
      <Card className="w-full">
        <h1 className="text-2xl font-bold text-neutral-900">Seller Login</h1>
        <p className="mt-2 text-sm text-neutral-600">Use magic link to access dashboard.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </Card>
    </main>
  );
}
