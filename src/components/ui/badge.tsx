import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium tracking-tight whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "border-[#242424]/14 bg-[#F6EBD8] text-[#242424]",
        orange: "border-[#FF7043]/30 bg-[#FF7043]/15 text-[#A83310]",
        yellow: "border-[#FFD166]/70 bg-[#FFD166]/40 text-[#664400]",
        mint: "border-[#B7E4C7]/80 bg-[#B7E4C7]/50 text-[#1D4D2E]",
        pink: "border-[#FFB4C2]/70 bg-[#FFB4C2]/40 text-[#7F1D32]",
        dark: "border-[#242424] bg-[#242424] text-[#FFF8ED]",
        outline: "border-[#242424]/18 bg-white/80 text-[#242424]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
