import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { Lang } from "@/lib/i18n";

type Props = {
  children: React.ReactNode;
  email: string;
  credits: number;
  pendingOrders?: number;
  planLabel: string;
  lang: Lang;
  initial: string;
  signout: React.ReactNode;
  navItems: Array<{ href: string; label: string }>;
  i18n: {
    welcome: string;
    aiCredits: string;
    pendingOrders: string;
    langEn: string;
    langZh: string;
    langMs: string;
    plan: string;
    sellerOs: string;
  };
};

export function AppShell({ children, email, credits, pendingOrders = 0, planLabel, lang, initial, signout, navItems, i18n }: Props) {
  return (
    <div className="min-h-screen bg-bb-bg text-bb-text bg-[radial-gradient(circle_at_28%_20%,rgba(0,194,168,0.16),transparent_44%),radial-gradient(circle_at_80%_22%,rgba(201,162,39,0.14),transparent_40%),radial-gradient(circle_at_60%_75%,rgba(255,255,255,0.06),transparent_34%)]">
      <div className="grid grid-cols-[260px_1fr]">
        <aside className="h-screen sticky top-0 bg-bb-brand/40 border-r border-bb-border/5">
          <Sidebar items={navItems} planLabel={planLabel} planTitle={i18n.plan} sellerOsLabel={i18n.sellerOs} />
        </aside>

        <main className="min-h-screen">
          <Topbar email={email} credits={credits} pendingOrders={pendingOrders} initial={initial} signout={signout} lang={lang} i18n={i18n} />
          <div className="px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
