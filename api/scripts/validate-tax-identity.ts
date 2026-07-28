import {
  makeUkTaxIdentityExampleDetail,
  ukTaxIdentity,
  ukTaxIdentityExampleDetailSchema,
  validateUkTaxIdentity,
} from "../src/uk-tax-identity.js";

validateUkTaxIdentity(structuredClone(ukTaxIdentity));
for (const example of ukTaxIdentity.exampleProfiles) {
  ukTaxIdentityExampleDetailSchema.parse(
    makeUkTaxIdentityExampleDetail(example.id),
  );
}

console.log(
  [
    `UK tax identity ${ukTaxIdentity.meta.version} is valid:`,
    `${ukTaxIdentity.dimensions.length} dimensions,`,
    `${ukTaxIdentity.archetypes.length} archetypes,`,
    `${ukTaxIdentity.overlaps.length} overlaps,`,
    `${ukTaxIdentity.exampleProfiles.length} synthetic examples,`,
    `${ukTaxIdentity.sources.length} sources.`,
  ].join(" "),
);
