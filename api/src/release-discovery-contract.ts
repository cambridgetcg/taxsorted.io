import { z } from "@hono/zod-openapi";

export const releaseLedgerPath = "/v1/open-data/releases";
export const releaseJsonFeedPath = `${releaseLedgerPath}/feed.json`;
export const releaseAtomFeedPath = `${releaseLedgerPath}/feed.atom`;

export const releaseDiscoveryHandles = {
  ledger: releaseLedgerPath,
  jsonFeed: releaseJsonFeedPath,
  atom: releaseAtomFeedPath,
} as const;

const calendarDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.valueOf()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Expected a real calendar day");

const xmlSafeText = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value),
    "XML control characters are not allowed",
  );

const publicGraphRoots: Readonly<Record<string, string>> = {
  "uk-tax-system": "/v1/tax-system/uk",
  "uk-tax-industry": "/v1/tax-industry/uk",
  "uk-charities-sector": "/v1/charities/uk",
  "uk-public-funding": "/v1/public-funding/uk",
};

export const releaseCheckpointLinksSchema = z
  .object({
    manifest: xmlSafeText.regex(/^\//),
    currentGraph: xmlSafeText.regex(/^\//),
    immutableSnapshot: z.null(),
    schema: xmlSafeText.regex(/^\//),
    exports: xmlSafeText.regex(/^\//),
  })
  .strict()
  .openapi("OpenDataReleaseCheckpointLinks");

export const releaseCheckpointSchema = z
  .object({
    id: xmlSafeText,
    kind: z.enum(["baseline-checkpoint", "release-checkpoint"]),
    datasetId: xmlSafeText.regex(/^[a-z0-9-]+$/),
    title: xmlSafeText.max(500),
    version: xmlSafeText.regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
    evidenceReviewedOn: calendarDay,
    observedPublicOn: calendarDay,
    publicationStatusAtCheckpoint: z.literal("open"),
    assertionScope: z.literal("dataset-release-snapshot"),
    recordChangeClaims: z.literal("none"),
    digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    links: releaseCheckpointLinksSchema,
  })
  .strict()
  .superRefine((checkpoint, context) => {
    const expectedId = `urn:taxsorted:release-checkpoint:${checkpoint.datasetId}:${checkpoint.version}`;
    if (checkpoint.id !== expectedId) {
      context.addIssue({
        code: "custom",
        path: ["id"],
        message: `Expected ${expectedId}`,
      });
    }
    const root = publicGraphRoots[checkpoint.datasetId];
    if (!root) {
      context.addIssue({
        code: "custom",
        path: ["datasetId"],
        message: "No reviewed public graph root is declared for this dataset",
      });
      return;
    }
    for (const [field, suffix] of [
      ["manifest", "/manifest"],
      ["currentGraph", "/graph"],
      ["schema", "/schema"],
      ["exports", "/exports"],
    ] as const) {
      if (checkpoint.links[field] !== `${root}${suffix}`) {
        context.addIssue({
          code: "custom",
          path: ["links", field],
          message: `Expected ${root}${suffix}`,
        });
      }
    }
  })
  .openapi("OpenDataReleaseCheckpoint");

export const releaseCheckpointLedgerSchema = z
  .array(releaseCheckpointSchema)
  .min(1);

export type ReleaseCheckpoint = z.infer<typeof releaseCheckpointSchema>;
