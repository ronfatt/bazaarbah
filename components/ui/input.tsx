import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-white/10 bg-[#163C33] px-3 text-sm text-[#F3F4F6] outline-none placeholder:text-[#6B7280] focus:border-[#00C2A8]/60",
        props.className,
      )}
    />
  );
}
