"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Checkbox on the real theme tokens, with a 44px hit area.
 * The root (the real button) is 44x44 so it is easy to tap; the negative
 * margin keeps its footprint in the layout the size of the visible 20px box.
 * Keyboard focus uses the global 3px accent outline from globals.css.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "group peer relative -m-3 flex h-11 w-11 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {/* The visible box. Checked state is styled from the root's data-state. */}
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border-2 border-ink-soft bg-white transition-colors group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent">
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="h-4 w-4" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </span>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
