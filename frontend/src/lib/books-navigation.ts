import type { SourceType } from "@taxsorted/engine/uk/itsa";

/** Carry only a recognised activity, never identifiers or unrelated query data. */
export function withBooksActivity(href: string, activity?: SourceType): string {
  if (activity !== "uk-property" && activity !== "self-employment") return href;
  const [beforeHash, hash] = href.split("#", 2);
  const [path, query] = beforeHash.split("?", 2);
  const search = new URLSearchParams(query);
  search.set("activity", activity);
  return `${path}?${search.toString()}${hash ? `#${hash}` : ""}`;
}
