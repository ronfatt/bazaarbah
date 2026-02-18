import { Badge } from "@/components/ui/Badge";

type Props = {
  email: string;
  credits: number;
  initial: string;
  signout: React.ReactNode;
};

export function Topbar({ email, credits, initial, signout }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-bb-bg/70 backdrop-blur-xl border-b border-bb-border/5">
      <div className="h-16 px-6 flex items-center justify-between">
        <div className="text-sm text-bb-muted">
          Welcome back, <span className="text-bb-text font-medium">{email}</span>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="ai">AI Credits {credits}</Badge>
          <div className="h-9 w-9 rounded-full bg-bb-surface2/80 border border-bb-border/10 grid place-items-center text-sm font-semibold">{initial}</div>
          {signout}
        </div>
      </div>
    </div>
  );
}
