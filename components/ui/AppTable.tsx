import { cn } from "@/lib/utils";

export function AppTable({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-left text-sm", className)} {...props} />;
}

export function AppTableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-hidden rounded-2xl border border-bb-border/5 bg-bb-surface/60", className)} {...props} />;
}
