import { cn } from "@/lib/utils";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-900 outline-none ring-amber-300 placeholder:text-neutral-400 focus:ring-2",
        props.className,
      )}
    />
  );
}
