import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { AppButton } from "@/components/ui/AppButton";

export default async function AdminAuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const admin = createAdminClient();
      const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role === "admin") {
        redirect("/admin/plan-requests");
      }
    }
  } catch {
    // keep page usable even if auth bootstrap fails temporarily
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_25%_30%,rgba(0,194,168,0.08),transparent_42%),radial-gradient(circle_at_80%_22%,rgba(201,162,39,0.08),transparent_40%),#071A16] text-bb-text">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-8 py-10">
        <section className="w-full max-w-md rounded-2xl border border-white/12 bg-bb-surface/70 p-8 shadow-[0_0_40px_rgba(0,194,168,0.1)] backdrop-blur-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-bb-ai/20 bg-bb-ai/10 px-3 py-1 text-xs text-bb-ai">
            <ShieldCheck size={14} /> ADMIN PORTAL
          </p>
          <h1 className="mt-3 text-3xl font-bold">Admin Login</h1>
          <p className="mt-2 text-sm text-white/65">Only accounts with admin role can enter approval dashboard.</p>
          {params.error === "not_admin" && <p className="mt-3 text-sm text-rose-300">Current account is not admin. Please login with an admin account.</p>}
          <div className="mt-6">
            <AdminLoginForm />
          </div>
          <div className="mt-4">
            <Link href="/auth">
              <AppButton variant="ghost" className="w-full">
                Back to Seller Login
              </AppButton>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

