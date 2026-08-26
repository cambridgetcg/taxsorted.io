import Link from "next/link";
import type { BooksSummary } from "@/lib/books-summary";

interface NextAction {
  href: string;
  title: string;
  body: string;
}

function nextActions(summary: BooksSummary): NextAction[] {
  if (summary.eventCount === 0) {
    return [
      {
        href: "/books/workspace/money?start=manual",
        title: "Add money in or out",
        body: "Start with one amount. It waits for your check before changing a total.",
      },
      {
        href: "/books/workspace/money?start=csv",
        title: "Bring in a CSV file",
        body: "Use a file from your bank or current bookkeeping app.",
      },
      {
        href: "/books/workspace/money#made-up-example",
        title: "Try a made-up example",
        body: "See why bank money, income and costs can be different facts.",
      },
    ];
  }

  const actions: NextAction[] = [];
  if (summary.needsReviewCount > 0) {
    actions.push({
      href: "/books/workspace/money",
      title: `Check ${summary.needsReviewCount} waiting item${summary.needsReviewCount === 1 ? "" : "s"}`,
      body: "They do not change a total until you say what happened.",
    });
  }
  if (summary.readyWaitingForScopeCount > 0) {
    actions.push({
      href: "/books/workspace/business",
      title: "Confirm each group covers one business",
      body: "Checked items stay out of totals until you confirm each group contains records for one separate business.",
    });
  }
  if (summary.readyConfirmedCount > 0) {
    actions.push({
      href: "/books/workspace/business",
      title: "See what the records show",
      body: "View each confirmed business separately, with the dates and limits beside it.",
    });
    actions.push({
      href: "/books/workspace/tax",
      title: "See the Income Tax view",
      body: "Inspect cumulative category totals. Nothing has been sent.",
    });
  }
  if (summary.excludedCount > 0) {
    actions.push({
      href: "/books/workspace/money",
      title: `See ${summary.excludedCount} item${summary.excludedCount === 1 ? "" : "s"} not counted`,
      body: "They stay in history and out of totals unless you send one back to To check.",
    });
  }
  if (actions.length < 3) {
    actions.push({
      href: "/books/workspace/money",
      title: "Add more records",
      body: "Add one movement or bring in another CSV file.",
    });
  }
  return actions.slice(0, 3);
}

function statusCopy(summary: BooksSummary): { title: string; body: string } {
  if (summary.eventCount === 0) {
    return {
      title: "No records yet",
      body: "Add money in or out, or bring in a CSV file. Every item waits for your check first.",
    };
  }
  if (summary.needsReviewCount > 0) {
    return {
      title: `${summary.needsReviewCount} item${summary.needsReviewCount === 1 ? " needs" : "s need"} your check`,
      body: "Waiting items do not change your totals.",
    };
  }
  if (summary.readyWaitingForScopeCount > 0) {
    return {
      title: `${summary.readyWaitingForScopeCount} checked item${summary.readyWaitingForScopeCount === 1 ? " cannot" : "s cannot"} count yet`,
      body: "Confirm that each group contains records for one separate business before they count.",
    };
  }
  return {
    title: "Nothing is waiting for your check",
    body: "This describes saved records only. Bank checking is not live, so it does not prove every movement is present.",
  };
}

export function BooksToday({ summary }: { summary: BooksSummary }) {
  const status = statusCopy(summary);
  const actions = nextActions(summary);

  return (
    <section aria-labelledby="today-heading" className="space-y-8">
      <div className="soft-shadow overflow-hidden rounded-[2rem] border border-line bg-surface">
        <div className="bg-accent-soft p-6 sm:p-8">
          <p className="section-label">Today</p>
          <h2 id="today-heading" className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {status.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">{status.body}</p>
        </div>
        <dl className="grid divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            ["Waiting", summary.needsReviewCount],
            ["Checked and counted", summary.readyConfirmedCount],
            ["Waiting for business check", summary.readyWaitingForScopeCount],
            ["Not counted", summary.excludedCount],
          ].map(([label, value]) => (
            <div key={label} className="p-4 sm:p-5">
              <dt className="text-sm text-ink-soft">{label}</dt>
              <dd className="mt-1 font-display text-3xl font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section aria-labelledby="next-actions-heading">
        <p className="section-label">What you can do now</p>
        <h2 id="next-actions-heading" className="mt-3 font-display text-2xl font-semibold text-ink">
          Choose one small next action
        </h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-3">
          {actions.map((action, index) => (
            <li key={`${action.href}:${action.title}`}>
              <Link
                href={action.href}
                aria-label={action.title}
                aria-describedby={`books-next-action-${index}-description`}
                className="group flex h-full min-h-40 flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent hover:bg-accent-soft"
              >
                <span className="text-lg font-semibold text-ink group-hover:text-accent-deep">
                  {action.title}
                </span>
                <span
                  id={`books-next-action-${index}-description`}
                  className="mt-2 text-sm leading-6 text-ink-soft"
                >
                  {action.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p role="note" className="rounded-2xl border border-line bg-paper p-4 text-sm leading-6 text-ink-soft">
        Money arrives or leaves. You say what happened. It waits for your check. Only checked
        items inside a confirmed business change the totals shown here.
      </p>
    </section>
  );
}
