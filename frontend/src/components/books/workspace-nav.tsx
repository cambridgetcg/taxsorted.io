import Link from "next/link";

export type BooksWorkspaceNavView = "today" | "money" | "business" | "tax";

const VIEWS: readonly {
  view: BooksWorkspaceNavView;
  href: string;
  label: string;
}[] = [
  { view: "today", href: "/books/workspace", label: "Today" },
  { view: "money", href: "/books/workspace/money", label: "Money" },
  { view: "business", href: "/books/workspace/business", label: "Business" },
  { view: "tax", href: "/books/workspace/tax", label: "Tax" },
];

/**
 * Four ordinary links into the Books workspace. These are navigation, not an
 * ARIA tab widget: every destination has its own URL and normal browser
 * back/forward behaviour. The visible word is also the accessible name.
 */
export function BooksWorkspaceNav({ view }: { view: BooksWorkspaceNavView }) {
  return (
    <nav aria-label="Books sections">
      <ul className="flex flex-wrap gap-2">
        {VIEWS.map((item) => {
          const current = item.view === view;
          return (
            <li key={item.view}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "inline-flex min-h-11 items-center rounded-full border border-accent bg-accent px-4 text-base font-semibold text-white"
                    : "inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-base font-medium text-ink hover:border-accent hover:bg-accent-soft"
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
