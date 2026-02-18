import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-white/10 bg-[#0B241F] px-3 text-sm text-bb-text outline-none",
        "placeholder:text-white/30 focus:border-[#00C2A8]/50 focus:ring-2 focus:ring-[#00C2A8]/20",
        props.className,
      )}
    />
  );
}
