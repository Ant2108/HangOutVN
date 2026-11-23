import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display font-semibold transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7043] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8ED] active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[#FF7043] text-[#242424] border border-[#242424]/15 shadow-[0_6px_20px_-8px_rgba(255,112,67,0.75)] hover:bg-[#ff5f2e] hover:-translate-y-0.5",
        dark:
          "bg-[#242424] text-[#FFF8ED] border border-[#242424] hover:bg-[#383532] hover:-translate-y-0.5",
        outline:
          "bg-[#FFFFFF] text-[#242424] border border-[#242424]/20 hover:border-[#242424]/50 hover:bg-[#FFF8ED]",
        soft:
          "bg-[#F6EBD8] text-[#242424] border border-[#242424]/10 hover:bg-[#eedec2]",
        mint:
          "bg-[#B7E4C7] text-[#242424] border border-[#242424]/12 hover:bg-[#a2dbb6]",
        yellow:
          "bg-[#FFD166] text-[#242424] border border-[#242424]/12 hover:bg-[#f7c348]",
        ghost: "bg-transparent text-[#242424] hover:bg-[#242424]/6",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
