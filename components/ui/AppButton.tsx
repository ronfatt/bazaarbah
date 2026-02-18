import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-bb-gold/90 to-bb-gold text-black hover:brightness-110 shadow-glowGold",
        secondary: "bg-bb-surface2/70 border border-bb-border/10 text-bb-text hover:bg-bb-surface2",
        ai: "bg-bb-ai text-black hover:bg-bb-ai/85 shadow-glowAI",
      },
      size: {
        default: "h-10",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants>;

export function AppButton({ className, variant, size, ...props }: Props) {
  return <button className={cn(variants({ variant, size }), className)} {...props} />;
}
