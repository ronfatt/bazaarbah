import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#C9A227] px-6 py-2 text-black hover:bg-[#D4AF37]",
        outline: "bg-[#163C33] border border-white/10 text-white hover:border-white/20",
        ghost: "text-[#F3F4F6] hover:bg-white/5",
        ai: "bg-[#00C2A8] text-black shadow-[0_0_0_0_rgba(0,194,168,0.45)] hover:bg-[#00C2A8]/80 hover:shadow-[0_0_0_6px_rgba(0,194,168,0.12)]",
        danger: "bg-red-600 text-white hover:bg-red-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
