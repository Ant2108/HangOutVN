import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-[#242424]/16 bg-white px-4 py-2 text-sm text-[#242424] placeholder:text-[#5C564F]/70 transition-colors focus-visible:border-[#FF7043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7043]/25 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
