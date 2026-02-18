import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-[#C9A227] to-[#E2C044] text-black hover:brightness-110 shadow-[0_10px_30px_rgba(201,162,39,0.18)]",
        secondary: "bg-bb-surface2/70 border border-bb-border/10 text-bb-text hover:bg-bb-surface2",
        ai: "border border-bb-ai/35 bg-bb-ai/12 text-bb-ai hover:bg-bb-ai/18 hover:border-bb-ai/45 shadow-[0_0_28px_rgba(0,194,168,0.10)]",
        ghost: "bg-transparent border border-white/12 text-white/85 hover:border-white/18 hover:bg-white/5",
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
