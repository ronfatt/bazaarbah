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
    <div className="min-h-screen bg-bb-bg text-bb-text">
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
