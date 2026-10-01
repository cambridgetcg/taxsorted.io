"use client";

import { Suspense, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { withBooksActivity } from "@/lib/books-navigation";

type ActivityLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** Keep the chosen kind of books when moving from a service page into a task. */
export function BooksActivityLink(props: ActivityLinkProps) {
  return (
    <Suspense fallback={
      <span aria-disabled="true" aria-busy="true" className={`${props.className ?? ""} cursor-wait opacity-60`}>
        <span className="sr-only">Loading link: </span>{props.children}
      </span>
    }>
      <ResolvedActivityLink {...props} />
    </Suspense>
  );
}

function ResolvedActivityLink({
  href,
  ...props
}: ActivityLinkProps) {
  const requestedActivity = useSearchParams().get("activity");
  const activity = requestedActivity === "uk-property" || requestedActivity === "self-employment"
    ? requestedActivity
    : undefined;

  return <Link {...props} href={withBooksActivity(href, activity)} />;
}
