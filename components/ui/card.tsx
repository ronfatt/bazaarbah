import { cn } from "@/lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-2xl border border-white/5 bg-[#112E27] p-6 shadow-xl", props.className)} />;
}
