import { cn } from "@/lib/utils";

/** Loading placeholder in the theme's line colour (warm, not cold gray). */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-line", className)}
      {...props}
    />
  );
}

export { Skeleton };
