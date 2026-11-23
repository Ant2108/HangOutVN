import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <select
          ref={ref}
          className={cn(
            "flex h-11 w-full appearance-none rounded-2xl border border-[#242424]/16 bg-white pl-4 pr-10 text-sm font-medium text-[#242424] transition-colors cursor-pointer hover:border-[#242424]/35 focus-visible:border-[#FF7043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7043]/25 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C564F]"
        />
      </div>
    );
  }
);
Select.displayName = "Select";
