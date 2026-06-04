// What VAT treatment applies — in plain English, so nobody needs a lawyer to categorise.
//
// Five treatments, and the difference that trips everyone up: zero-rated is taxable at 0%
// (you CAN reclaim VAT on costs), exempt is not (you CAN'T). Outside-scope isn't VAT at all.
//
// This is honest guidance, not the statute. Edge cases (catering, "eligible body" education,
// mixed supplies) are flagged — when in doubt, check the linked HMRC rule.

export type VatTreatment = "standard" | "reduced" | "zero" | "exempt" | "outside-scope";

export interface TreatmentInfo {
  treatment: VatTreatment;
  /** Rate as a fraction, or null where VAT doesn't apply. */
  rate: number | null;
  /** Can you reclaim VAT on related costs? This is the zero-vs-exempt catch. */
  inputVatRecoverable: boolean;
  /** One clean sentence anyone can understand. */
  plain: string;
}

export const TREATMENTS: Record<VatTreatment, TreatmentInfo> = {
  standard: {
    treatment: "standard",
    rate: 0.2,
    inputVatRecoverable: true,
    plain: "The normal rate. You charge 20%, and you can reclaim VAT on related costs.",
  },
  reduced: {
    treatment: "reduced",
    rate: 0.05,
    inputVatRecoverable: true,
    plain: "A lower 5% rate for a short list of things like home energy. You can still reclaim VAT on costs.",
  },
  zero: {
    treatment: "zero",
    rate: 0,
    inputVatRecoverable: true,
    plain: "Taxable at 0% — you charge no VAT but still record the sale, and you CAN reclaim VAT on costs.",
  },
  exempt: {
    treatment: "exempt",
    rate: null,
    inputVatRecoverable: false,
    plain: "No VAT charged — and you CANNOT reclaim VAT on related costs. This is the part people confuse with zero-rated.",
  },
  "outside-scope": {
    treatment: "outside-scope",
    rate: null,
    inputVatRecoverable: false,
    plain: "Not part of VAT at all — no VAT, and it doesn't go on the return.",
  },
};

export interface Category {
  key: string;
  label: string;
  treatment: VatTreatment;
  /** Optional caveat where the real rule has a wrinkle. */
  note?: string;
}

/** Common business categories mapped to their usual VAT treatment. */
export const CATEGORIES: Category[] = [
  { key: "most-goods-services", label: "Most goods & services", treatment: "standard" },
  { key: "food-groceries", label: "Food & groceries", treatment: "zero", note: "Catering, hot takeaway, alcohol, sweets and crisps are standard-rated." },
  { key: "restaurant-hot-food", label: "Restaurant / hot takeaway", treatment: "standard" },
  { key: "books-newspapers", label: "Books, newspapers, e-books", treatment: "zero" },
  { key: "childrens-clothes", label: "Children's clothing & shoes", treatment: "zero" },
  { key: "domestic-energy", label: "Domestic fuel & power", treatment: "reduced" },
  { key: "public-transport", label: "Public passenger transport", treatment: "zero", note: "Vehicles carrying fewer than 10 passengers can differ." },
  { key: "exports-outside-uk", label: "Exports of goods outside the UK", treatment: "zero" },
  { key: "insurance", label: "Insurance", treatment: "exempt" },
  { key: "financial-services", label: "Financial services", treatment: "exempt" },
  { key: "postage-stamps", label: "Postage stamps", treatment: "exempt" },
  { key: "education-training", label: "Education & training", treatment: "exempt", note: "Only when supplied by an 'eligible body' such as a school or university." },
  { key: "health-medical", label: "Health & medical care", treatment: "exempt", note: "By registered professionals; cosmetic work can be standard-rated." },
  { key: "residential-rent", label: "Residential rent", treatment: "exempt", note: "Commercial property can be standard-rated if the owner has 'opted to tax'." },
  { key: "wages-salaries", label: "Wages & salaries", treatment: "outside-scope" },
  { key: "dividends", label: "Dividends", treatment: "outside-scope" },
  { key: "mot-test-fee", label: "MOT test fee (at cost)", treatment: "outside-scope" },
];

/** Look up a category and fold in its full treatment info + plain explanation. */
export function categorise(key: string): (Category & TreatmentInfo) | null {
  const c = CATEGORIES.find((x) => x.key === key);
  if (!c) return null;
  return { ...c, ...TREATMENTS[c.treatment] };
}

/** The plain facts for a treatment on its own. */
export function treatmentOf(treatment: VatTreatment): TreatmentInfo {
  return TREATMENTS[treatment];
}

/** The one thing most people get wrong, stated plainly. */
export const ZERO_VS_EXEMPT =
  "Zero-rated and exempt both mean 'no VAT to the customer' — but zero-rated lets you reclaim VAT on your costs, and exempt does not. If most of what you sell is exempt, you usually can't register for VAT.";
