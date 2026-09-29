"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { withBooksActivity } from "@/lib/books-navigation";
import { useMounted } from "@/lib/use-mounted";

/** Keep the chosen kind of books when moving from a service page into a task. */
export function BooksActivityLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const mounted = useMounted();
  const requestedActivity = mounted
    ? new URLSearchParams(window.location.search).get("activity")
    : null;
  const activity = requestedActivity === "uk-property" || requestedActivity === "self-employment"
    ? requestedActivity
    : undefined;

  return <Link {...props} href={withBooksActivity(href, activity)} />;
}
