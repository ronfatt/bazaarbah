import { cn } from "@/lib/utils";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-[#0B241F] p-3 text-sm text-bb-text outline-none",
        "placeholder:text-white/30 focus:border-[#00C2A8]/50 focus:ring-2 focus:ring-[#00C2A8]/20",
        props.className,
      )}
    />
  );
}
