import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Text input on the real theme tokens.
 * - border-ink-soft: the box edge is clearly visible (non-text contrast).
 * - min-h-11: 44px tall, easy to tap.
 * - No focus-visible:outline-none — the global 3px accent outline in
 *   globals.css is the one focus style everywhere.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-11 w-full rounded-md border border-ink-soft bg-white px-3 py-2 text-base text-ink placeholder:text-ink-soft file:border-0 file:bg-transparent file:text-base file:font-medium file:text-ink disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
