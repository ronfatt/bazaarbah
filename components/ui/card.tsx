import { cn } from "@/lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm", props.className)} />;
}
