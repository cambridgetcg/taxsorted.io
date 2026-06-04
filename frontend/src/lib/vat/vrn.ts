// UK VAT Registration Number (VRN) validation — offline, before you ever call HMRC.
//
// A correct VRN check catches typos for free: HMRC rejects bad VRNs with INVALID_VRN
// after a round-trip; this catches them instantly, client-side or agent-side.
//
// Standard 9-digit VRNs use the "modulus 97" checksum (with the newer "9755" variant):
//   - take the first 7 digits, weight them 8,7,6,5,4,3,2 and sum
//   - the 2 check digits (positions 8-9) must make (sum + check) divisible by 97,
//     OR (sum + check + 55) divisible by 97 (the post-2010 "9755" range)
// Worked: GB 980 7806 84 → 9·8+8·7+0·6+7·5+8·4+0·3+6·2 = 207; 207 + 84 = 291 = 3×97 ✓
//
// Government departments (GD000–GD499) and health authorities (HA500–HA999) are valid
// identifiers that carry NO checksum — they're matched by pattern only.

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2] as const;

/** Strip spaces, punctuation, and a leading "GB" prefix; uppercase. Keeps GD/HA forms. */
export function normalizeVrn(input: string): string {
  return (input ?? "")
    .toUpperCase()
    .replace(/[\s.\-]/g, "")
    .replace(/^GB/, ""); // "GBGD001" → "GD001", "GB980780684" → "980780684"
}

/** True if the string is a structurally valid UK VRN (standard 9/12-digit, GD, or HA). */
export function isValidVrn(input: string): boolean {
  const vrn = normalizeVrn(input);

  // Government department / health authority: pattern only, no check digit.
  if (/^GD\d{3}$/.test(vrn)) return Number(vrn.slice(2)) <= 499;
  if (/^HA\d{3}$/.test(vrn)) return Number(vrn.slice(2)) >= 500;

  // Standard VRN is 9 digits; branch traders add a 3-digit suffix (12 total).
  if (!/^\d{9}(\d{3})?$/.test(vrn)) return false;

  const digits = vrn.slice(0, 9).split("").map(Number);
  const check = digits[7] * 10 + digits[8];
  const sum = WEIGHTS.reduce((acc, w, i) => acc + digits[i] * w, 0);
  return (sum + check) % 97 === 0 || (sum + check + 55) % 97 === 0;
}

/** Returns a human/agent-readable reason a VRN is invalid, or null if it's fine. */
export function vrnError(input: string): string | null {
  const vrn = normalizeVrn(input);
  if (!vrn) return "Enter a VAT registration number.";

  // GD/HA government forms
  if (/^(GD|HA)/.test(vrn)) {
    return isValidVrn(vrn)
      ? null
      : "That isn’t a valid government (GD000–499) or health-authority (HA500–999) VAT number.";
  }

  if (!/^\d+$/.test(vrn)) return "A VAT number is digits only (a leading ‘GB’ is fine).";
  if (vrn.length !== 9 && vrn.length !== 12) {
    return `A UK VAT number is 9 digits (or 12 for a branch trader) — you entered ${vrn.length}.`;
  }
  if (!isValidVrn(vrn)) return "That VAT number fails its checksum — check for a typo.";
  return null;
}

/** Format as "GB 123 4567 89" for display (GD/HA shown as-is with the GB prefix). */
export function formatVrn(input: string): string {
  const vrn = normalizeVrn(input);
  if (/^(GD|HA)\d{3}$/.test(vrn)) return `GB${vrn}`;
  if (vrn.length < 9) return input;
  return `GB ${vrn.slice(0, 3)} ${vrn.slice(3, 7)} ${vrn.slice(7, 9)}${vrn.slice(9)}`;
}
