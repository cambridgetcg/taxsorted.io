import type { ReactNode } from "react";
import { Info } from "lucide-react";

interface DemoNoticeProps {
  title?: string;
  children?: ReactNode;
}

/** A visible boundary around fictional or illustrative product surfaces. */
export function DemoNotice({
  title = "Example only",
  children,
}: DemoNoticeProps) {
  return (
    <aside
      aria-label={title}
      className="border-y border-line bg-accent-soft text-ink"
    >
      <div className="mx-auto flex max-w-4xl items-start gap-3 px-4 py-3 text-sm sm:px-6">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="leading-6">
          <strong className="font-semibold">{title}.</strong>
          {children ? <span className="ml-1">{children}</span> : null}
        </p>
      </div>
    </aside>
  );
}
