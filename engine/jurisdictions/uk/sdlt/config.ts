import type { Pence, SdltRateBand, SdltSource } from "./types";

export const STANDARD_RESIDENTIAL_BANDS: readonly SdltRateBand[] = [
  { upToPence: 12_500_000, rateBasisPoints: 0 },
  { upToPence: 25_000_000, rateBasisPoints: 200 },
  { upToPence: 92_500_000, rateBasisPoints: 500 },
  { upToPence: 150_000_000, rateBasisPoints: 1_000 },
  { upToPence: null, rateBasisPoints: 1_200 },
];

export const FIRST_TIME_BUYER_BANDS: readonly SdltRateBand[] = [
  { upToPence: 30_000_000, rateBasisPoints: 0 },
  { upToPence: 50_000_000, rateBasisPoints: 500 },
];

const checkedOn = "2026-07-10";

export const SDLT_SOURCES: readonly SdltSource[] = [
  {
    id: "fa2003-s55",
    title: "Finance Act 2003, section 55 — amount of tax chargeable",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2003/14/section/55",
    checkedOn,
  },
  {
    id: "fa2003-sch4",
    title: "Finance Act 2003, Schedule 4 — chargeable consideration",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2003/14/schedule/4",
    checkedOn,
  },
  {
    id: "fa2003-sch4za",
    title: "Finance Act 2003, Schedule 4ZA — higher rates for additional dwellings",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2003/14/schedule/4ZA",
    checkedOn,
  },
  {
    id: "fa2003-sch6za",
    title: "Finance Act 2003, Schedule 6ZA — relief for first-time buyers",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2003/14/schedule/6ZA",
    checkedOn,
  },
  {
    id: "fa2003-s75za",
    title: "Finance Act 2003, section 75ZA — increased rates for non-resident transactions",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2003/14/section/75ZA",
    checkedOn,
  },
  {
    id: "fa2003-sch9",
    title: "Finance Act 2003, Schedule 9 — right to buy and shared ownership leases",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2003/14/schedule/9",
    checkedOn,
  },
  {
    id: "fa2003-sch9a",
    title: "Finance Act 2003, Schedule 9A — non-resident transactions",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2003/14/schedule/9A",
    checkedOn,
  },
  {
    id: "fa2025-s51",
    title: "Finance Act 2025, section 51 — higher rates from 1 April 2025 and contract saving",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2025/8/section/51",
    checkedOn,
  },
  {
    id: "fa2021-sch16",
    title: "Finance Act 2021, Schedule 16 — non-resident surcharge commencement and transition",
    authority: "UK Parliament",
    url: "https://www.legislation.gov.uk/ukpga/2021/26/schedule/16",
    checkedOn,
  },
  {
    id: "hmrc-residential-rates",
    title: "Stamp Duty Land Tax: residential property rates",
    authority: "HM Revenue & Customs",
    url: "https://www.gov.uk/stamp-duty-land-tax/residential-property-rates",
    checkedOn,
  },
  {
    id: "hmrc-higher-rates",
    title: "Higher rates of Stamp Duty Land Tax",
    authority: "HM Revenue & Customs",
    url: "https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property",
    checkedOn,
  },
  {
    id: "hmrc-higher-rates-transitional",
    title: "Stamp Duty Land Tax Manual SDLTM09845A — higher-rates transitional rules",
    authority: "HM Revenue & Customs",
    url: "https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09845a",
    checkedOn,
  },
  {
    id: "hmrc-non-resident-rates",
    title: "Rates of Stamp Duty Land Tax for non-UK residents",
    authority: "HM Revenue & Customs",
    url: "https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents",
    checkedOn,
  },
  {
    id: "hmrc-rounding",
    title: "Stamp Duty Land Tax Manual SDLTM00050 — rates and final rounding",
    authority: "HM Revenue & Customs",
    url: "https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm00050",
    checkedOn,
  },
];

export const SDLT_RULESET = {
  id: "uk.sdlt.residential.individual.2025-04-01",
  revision: "2026-07-10.1",
  effectiveFrom: "2025-04-01",
  effectiveTo: null,
  reviewedOn: checkedOn,
  // One ordinary dwelling above £10bn is outside this first service boundary.
  // The cap also keeps descriptive pre-rounding decimals exact to 1/10,000p.
  maximumConsiderationPence: 1_000_000_000_000 as Pence,
  surchargeMinimumPence: 4_000_000 as Pence,
  firstTimeBuyerMaximumPence: 50_000_000 as Pence,
  higherRatesAdditionBasisPoints: 500,
  nonResidentAdditionBasisPoints: 200,
  sources: SDLT_SOURCES,
} as const;
