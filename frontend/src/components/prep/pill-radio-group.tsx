"use client";

// i18n: deferred to M2 — plain English for launch

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface PillRadioOption<T extends string> {
  value: T;
  label: string;
  /** Optional plain-words hint, shown as a native tooltip. */
  title?: string;
}

/**
 * A pill-styled radio group built on real <input type="radio">, so the
 * checked state is announced truthfully and arrow-key movement is the
 * browser's own — never hand-rolled aria on buttons. Every pill is at
 * least 44px tall (min-h-11), the touch-target floor.
 */
export function PillRadioGroup<T extends string>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  className,
}: {
  /** The group's accessible name, rendered as a legend. */
  label: string;
  /** Visually hide the legend (screen readers still hear it). */
  hideLabel?: boolean;
  options: readonly PillRadioOption<T>[];
  /** null = nothing chosen yet — announced truthfully as unchecked. */
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
}) {
  // Radios group by their name attribute; an auto id keeps two groups on
  // the same page (e.g. one per income source) from capturing each other.
  const groupName = useId();

  return (
    <fieldset className={className}>
      <legend className={hideLabel ? "sr-only" : "text-base font-medium text-ink"}>
        {label}
      </legend>
      <div className={cn("flex flex-wrap gap-2", hideLabel ? undefined : "mt-1.5")}>
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              title={option.title}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center rounded-md border px-3 py-1.5 text-base font-medium transition-colors",
                "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
                checked
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-white text-ink-soft hover:bg-paper hover:text-ink"
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
