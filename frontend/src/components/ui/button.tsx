import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button on the real theme tokens.
 * - Every size is at least 44px tall (min-h-11) — easy to tap.
 * - Labels are text-base (16px) — easy to read.
 * - No focus-visible:outline-none — the global 3px accent outline in
 *   globals.css is the one focus style everywhere.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-white hover:bg-accent-deep",
        destructive: "bg-red-700 text-white hover:bg-red-800",
        outline: "border border-ink-soft bg-white text-ink hover:bg-paper",
        secondary: "bg-accent-soft text-accent-deep hover:bg-line",
        ghost: "text-ink hover:bg-accent-soft",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 rounded-md px-3",
        lg: "min-h-11 rounded-md px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
