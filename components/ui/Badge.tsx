import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border", {
  variants: {
    variant: {
      ai: "bg-bb-ai/10 text-bb-ai border-bb-ai/15",
      pending: "bg-yellow-500/10 text-yellow-300 border-yellow-500/15",
      paid: "bg-green-500/10 text-green-400 border-green-500/15",
      cancelled: "bg-red-500/10 text-red-400 border-red-500/15",
      neutral: "bg-bb-surface2/50 text-bb-muted border-bb-border/10",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

type Props = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof variants>;

export function Badge({ className, variant, ...props }: Props) {
  return <span className={cn(variants({ variant }), className)} {...props} />;
}
