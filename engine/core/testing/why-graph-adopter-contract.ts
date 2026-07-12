import { describe, expect, it } from "vitest";
import {
  assertWhyGraphInvariants,
  type WhyGraph,
} from "../why-graph";
import {
  assertAdmittedWhyGraph,
  type WhyGraphAdopter,
} from "../why-graph-adopter";

export type WhyGraphAdopterFixture<TNative> = {
  graph: WhyGraph;
  native: TNative;
};

export type WhyGraphAdopterMutationCase<TNative> = {
  name: string;
  layer: "shared" | "domain";
  mutate: (fixture: WhyGraphAdopterFixture<TNative>) => void;
  error: RegExp;
};

/**
 * Reusable red-team runner. A domain case earns domain coverage only when the
 * mutated graph still passes the shared graph contract first.
 */
export function runWhyGraphAdopterContract<TNative>(options: {
  name: string;
  adopter: WhyGraphAdopter<TNative>;
  makeFixture: () => WhyGraphAdopterFixture<TNative>;
  cases: readonly WhyGraphAdopterMutationCase<TNative>[];
}): void {
  describe(options.name, () => {
    it("baseline: the unmodified fixture is admitted", () => {
      const fixture = options.makeFixture();
      expect(() => assertAdmittedWhyGraph(
        fixture.graph,
        fixture.native,
        options.adopter,
      )).not.toThrow();
    });
    for (const mutation of options.cases) {
      it(`${mutation.layer}: ${mutation.name}`, () => {
        const fixture = options.makeFixture();
        mutation.mutate(fixture);
        if (mutation.layer === "shared") {
          expect(() => assertWhyGraphInvariants(fixture.graph))
            .toThrow(mutation.error);
          return;
        }
        expect(() => assertWhyGraphInvariants(fixture.graph)).not.toThrow();
        expect(() => assertAdmittedWhyGraph(
          fixture.graph,
          fixture.native,
          options.adopter,
        )).toThrow(mutation.error);
      });
    }
  });
}
