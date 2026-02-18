import { cn } from "@/lib/utils";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-[#163C33] p-3 text-sm text-[#F3F4F6] outline-none placeholder:text-[#6B7280] focus:border-[#00C2A8]/60",
        props.className,
      )}
    />
  );
}
