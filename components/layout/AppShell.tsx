import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

type Props = {
  children: React.ReactNode;
  email: string;
  credits: number;
  initial: string;
  signout: React.ReactNode;
  navItems: Array<{ href: string; label: string }>;
};

export function AppShell({ children, email, credits, initial, signout, navItems }: Props) {
  return (
    <div className="min-h-screen bg-bb-bg text-bb-text bg-[radial-gradient(circle_at_28%_20%,rgba(0,194,168,0.16),transparent_44%),radial-gradient(circle_at_80%_22%,rgba(201,162,39,0.14),transparent_40%),radial-gradient(circle_at_60%_75%,rgba(255,255,255,0.06),transparent_34%)]">
      <div className="grid grid-cols-[260px_1fr]">
        <aside className="h-screen sticky top-0 bg-bb-brand/40 border-r border-bb-border/5">
          <Sidebar items={navItems} />
        </aside>

        <main className="min-h-screen">
          <Topbar email={email} credits={credits} initial={initial} signout={signout} />
          <div className="px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
