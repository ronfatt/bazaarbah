import { cn } from "@/lib/utils";

export function AppCard({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-bb-surface/50 border border-bb-border/5 shadow-soft backdrop-blur-xl", className)} {...props} />;
}
