import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TaxSortedLockup } from "../TaxSortedLockup";
import { TaxSortedMark } from "../TaxSortedMark";

// docs/design/brand/render-brand.py checks the components against the native master and writes these
// exports, but it needs VectorCraft. This test needs only the files, so CI still catches a component
// that was edited without re-running the pipeline.
const exportsDirectory = resolve(process.cwd(), "..", "docs/design/brand/exports");

/** Each shape in order with its geometry and paint: text colour or the reader variable. */
function shapes(svg: string) {
  return [...svg.matchAll(/<(path|circle)\b([^>]*?)\/?>/g)].map(([, tag, attributes]) => {
    const values = Object.fromEntries(
      [...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]),
    );
    return {
      tag,
      geometry: tag === "path" ? values.d : `${values.cx} ${values.cy} ${values.r}`,
      paint: values.style?.includes("var(--ts-mark-reader") ? "reader" : values.fill,
    };
  });
}

function drawing(svg: string) {
  return { viewBox: svg.match(/viewBox="([^"]+)"/)?.[1], shapes: shapes(svg) };
}

const exported = (name: string) => drawing(readFileSync(resolve(exportsDirectory, name), "utf8"));
const rendered = (element: ReactElement) => drawing(renderToStaticMarkup(element));

const cases: Array<[string, string, ReactElement]> = [
  ["TaxSortedMark", "mark.svg", <TaxSortedMark key="mark" />],
  ["TaxSortedMark small", "mark-small.svg", <TaxSortedMark key="mark-small" size="small" />],
  ["TaxSortedLockup", "lockup-mono.svg", <TaxSortedLockup key="lockup" />],
  ["TaxSortedLockup small", "lockup-small-mono.svg", <TaxSortedLockup key="lockup-small" size="small" />],
];

describe("brand components", () => {
  it.each(cases)("%s draws exactly the geometry in exports/%s", (_name, file, element) => {
    const expected = exported(file);
    expect(expected.shapes.length).toBeGreaterThan(1);
    expect(rendered(element)).toEqual(expected);
  });

  it("is decorative by default and lets callers name it", () => {
    expect(renderToStaticMarkup(<TaxSortedMark />)).toContain('aria-hidden="true" focusable="false"');
    const named = renderToStaticMarkup(
      <TaxSortedLockup aria-hidden={false} role="img" aria-label="TaxSorted" className="h-9 w-auto" />,
    );
    expect(named).toContain('aria-hidden="false"');
    expect(named).toContain('aria-label="TaxSorted"');
    expect(named).toContain('class="h-9 w-auto"');
  });

  // mark.svg is written from the component itself, so the comparison above cannot catch a moved reader paint.
  it("paints the mark's one circle as the reader and its pages and binding in the text colour", () => {
    for (const element of [<TaxSortedMark key="a" />, <TaxSortedMark key="b" size="small" />]) {
      const painted = shapes(renderToStaticMarkup(element)).map(({ tag, paint }) => `${tag} ${paint}`);
      expect(painted).toEqual(["path currentColor", "circle reader"]);
    }
  });

  it("reads --ts-mark-reader but never sets it, so the :root forced-colours rule wins", () => {
    for (const element of [<TaxSortedMark key="a" />, <TaxSortedLockup key="b" size="small" />]) {
      const markup = renderToStaticMarkup(element);
      expect(markup).toContain("var(--ts-mark-reader, currentColor)");
      expect(markup).not.toMatch(/--ts-mark-reader\s*:/);
    }
  });
});
