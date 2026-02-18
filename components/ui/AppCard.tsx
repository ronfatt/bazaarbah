import { cn } from "@/lib/utils";

export function AppCard({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[#12352E]/65 backdrop-blur-xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
        "transition hover:border-white/[0.14] hover:bg-[#16423A]/70 hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}
