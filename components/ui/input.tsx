import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-bb-border/10 bg-bb-surface2 px-3 text-sm text-bb-text outline-none placeholder:text-bb-muted/70 focus:border-bb-ai/60 focus:ring-2 focus:ring-bb-ai/40",
        props.className,
      )}
    />
  );
}
