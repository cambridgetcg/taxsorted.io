# Gov-Transparency Pillar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The "how the tax state works & how to move it" pillar: four Learn guides + a verified contacts data file with staleness discipline, built from the live-verified corpus in `regs/research/gov/` (159 claims, verified 2026-07-06).

**Architecture:** Pure content + one data module. Pages follow the established M1 Learn patterns exactly (server pages, `<Cited>` for every factual claim, EducationNotice-style disclaimers, plain English, i18n deferred comments, jsdom-docblock tests). The data file is TypeScript (not JSON) so each entry carries typed provenance; a vitest staleness test enforces re-verification discipline. Facts come ONLY from `regs/research/gov/*.md` — the corpus IS the source; a claim not in the corpus doesn't ship (no fresh research during implementation; gaps go to a backlog note).

**Tech Stack:** Next.js 16 static export, existing prep components, vitest.

## Global Constraints

- **Role-anchored, date-stamped**: office-holder names appear only as `holder` fields with `asOf: '2026-07-06'`, never in prose as timeless facts. Prose says "the Exchequer Secretary to the Treasury (the tax minister)".
- **Every external URL** comes verbatim from `regs/research/gov/*.md` (already live-verified). NEVER guess a slug (the M1 FHL lesson).
- **Responsible publishing**: only official, public contact channels (gov.uk-published lines/forms/addresses). Every contacts surface carries the anti-phishing note ("HMRC will never call/text you demanding payment — these are routes for YOU to contact THEM") and the civility line. No personal emails of named officials, ever.
- **Political neutrality**: mechanism not opinion. Criticism appears only as sourced fact (e.g. Lords sub-committee findings, PAC reports) with citation. No party references beyond officeholder identification.
- **Devolution honesty**: every income-tax-adjacent page notes Scotland/Wales divergence where it bites (guide 1 & 2 sections; the M2 backlog carries the full devolved guide).
- **Wrong-door router**: everywhere policy influence is discussed, the "is your problem actually an individual dispute?" box routes to complaints/tribunal paths instead.
- **OGL v3**: quoted gov.uk material gets source attribution per the Open Government Licence.
- Copy discipline: never "HMRC approved"; disclaimers per M1 conventions.
- All existing tests stay green. Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: The civic data module + staleness discipline

**Files:**
- Create: `frontend/src/lib/gov/contacts.ts`, `frontend/src/lib/gov/__tests__/contacts.test.ts`

**Interfaces:**
- Produces (consumed by all pages):

```ts
export interface VerifiedFact { sourceUrl: string; verifiedOn: string /* ISO date */ }
export interface RoleEntry extends VerifiedFact {
  id: string                    // 'exchequer-secretary'
  body: 'hmrc' | 'hmt' | 'parliament' | 'independent'
  role: string                  // 'Exchequer Secretary to the Treasury'
  whatTheyDo: string            // one plain-words sentence
  holder?: { name: string; asOf: string }
  contactRoute?: string         // plain-words HOW to reach the office (route, not personal details)
  contactUrl?: string
}
export interface ContactChannel extends VerifiedFact {
  id: string; audience: string; channel: string; details: string; hours?: string
}
export const ROLES: RoleEntry[]           // from regs/research/gov/{treasury,hmrc-anatomy,parliament}.md
export const HMRC_CHANNELS: ContactChannel[]  // from regs/research/gov/hmrc-anatomy.md contact section
export const STALENESS_DAYS = 90
export function staleEntries(today: string): Array<{ id: string; verifiedOn: string }>
```

- [ ] **Step 1: Failing test** — asserts: every entry has sourceUrl matching /^https:\/\/(www\.)?(gov\.uk|parliament\.uk|.*\.gov\.uk)/ or the named tool's domain; every verifiedOn parses as ISO date; every holder has asOf; `staleEntries('2026-07-06')` is empty TODAY and `staleEntries('2026-11-01')` flags everything (proves the mechanism); at least: the Exchequer Secretary role (tax minister note), HMRC CEO/First Permanent Secretary, Adjudicator's Office, Treasury Select Committee chair route, SA helpline + extra-support channel entries.
- [ ] **Step 2: RED** — `npm test --workspace frontend -- gov` fails (module missing).
- [ ] **Step 3: Implement** — transcribe entries ONLY from `regs/research/gov/` (grep each fact; carry its URL). 15–25 roles, 8–15 channels. Include a top comment: "Data discipline: entries are re-verified against their sourceUrl; staleness >90d turns the UI badge amber (see gov pages). Never add an entry without a fetched source."
- [ ] **Step 4: GREEN + full suite.**
- [ ] **Step 5: Commit** `feat(web): civic data module — roles, channels, staleness discipline`.

### Task 2: Guide 1 — How a tax law is born (`/learn/gov/how-tax-law-is-made`)

**Files:**
- Create: `frontend/src/app/learn/gov/how-tax-law-is-made/page.tsx`
- Test: `frontend/src/app/learn/gov/__tests__/lawmaking.test.tsx`

Sections (each fact `<Cited>` from `regs/research/gov/lawmaking.md`): the single-fiscal-event cycle; Budget → Ways & Means → PCTA 1968 ("you pay before it's law" — the surprise, cited to legislation); Finance Bill stages incl. PBC written-evidence email route; money-bill limits on the Lords + the EAC Finance Bill Sub-Committee's real role; SIs (negative/affirmative, the 1979 fact, SI 2026/336 as worked example); L-day and consultations; the OTS-abolition scrutiny gap (sourced); the MTD 11-year trace as a timeline component; NICs-don't-ride-Finance-Bills note; devolution note (Scottish/Welsh rate-setting is separate — link the corpus-verified gov.uk pages); the wrong-door box.

Test asserts: h1; PCTA passage present; ≥2 legislation.gov.uk links; the wrong-door box text; zero occurrences of "approved".

- [ ] Steps: RED → implement → GREEN + suite + build → commit `feat(web): learn/gov — how a tax law is born`.

### Task 3: Guide 2 — Who runs your taxes (`/learn/gov/who-runs-your-taxes`)

**Files:**
- Create: `frontend/src/app/learn/gov/who-runs-your-taxes/page.tsx`, `frontend/src/components/gov/role-card.tsx`, `frontend/src/components/gov/contact-table.tsx`
- Test: `frontend/src/app/learn/gov/__tests__/who-runs.test.tsx`

Content from `hmrc-anatomy.md` + `treasury.md`: HMRC-is-non-ministerial explainer (why ministers can't touch your case); the policy-partnership split (HMT strategy / HMRC delivery, cited to the framework doc); RoleCards driven by `ROLES` (renders role + whatTheyDo + holder w/ "as of {asOf}" badge + amber "re-verify" badge when stale via `staleEntries`); the complaints ladder (Tier1→Tier2→Adjudicator→PHSO-via-MP) as a step component with the wrong-door box INVERTED (this IS the individual-dispute door; policy stuff → guide 3); ContactTable driven by `HMRC_CHANNELS` with the anti-phishing callout ABOVE it (constraint wording); extra-support team highlighted; SAR-vs-FOI box ("your own data = SAR, not FOI", cited).

Test asserts: anti-phishing text present; a role card shows "as of" text; complaints ladder ordered; SAR passage present.

- [ ] Steps: RED → implement → GREEN + suite + build → commit `feat(web): learn/gov — who runs your taxes + verified contact routes`.

### Task 4: Guide 3 — Your levers (`/learn/gov/your-levers`)

**Files:**
- Create: `frontend/src/app/learn/gov/your-levers/page.tsx`
- Test: `frontend/src/app/learn/gov/__tests__/levers.test.tsx`

From `parliament.md` + `transparency-tools.md` + `participation.md`: find/contact your MP (official finder + WriteToThem, what MPs can actually do); select-committee written evidence (TSC), Finance Bill PBC email; Budget representations portal; petitions with honest thresholds AND honest track-record line (cited); FOI via WhatDoTheyKnow + the taxpayer-confidentiality carve-out (they will never release individual affairs — cited) + SAR cross-link; consultations (where they live, how to respond so it counts: evidence > opinion, cited to the principles doc); the toolbox list (TheyWorkForYou/Hansard search "Making Tax Digital", legislation.gov.uk explanatory memoranda tip, organograms); wrong-door box; civility + realistic-expectations passage (one well-evidenced submission vs 100 identical letters — from participation.md).

Test asserts: writetothem + whatdotheyknow hrefs present; the confidentiality carve-out passage; the wrong-door box.

- [ ] Steps: RED → implement → GREEN + suite + build → commit `feat(web): learn/gov — your levers on tax policy`.

### Task 5: Guide 4 — Receipts: when pressure worked (`/learn/gov/receipts`)

**Files:**
- Create: `frontend/src/app/learn/gov/receipts/page.tsx`
- Test: `frontend/src/app/learn/gov/__tests__/receipts.test.tsx`

From `participation.md` case studies (ONLY corpus-sourced ones): MTD's delays + threshold moves (who pushed, which lever, what changed — each step cited); IR35 2022 U-turn; HICBC threshold 2024; loan charge reviews. Each as a case-card: Problem → Who moved → Lever used → Outcome → Sources. Neutrality framing header: "These are receipts, not endorsements — the same levers work for any position." LITRG highlighted as the body that exists for unrepresented taxpayers.

Test asserts: ≥3 case cards; every card has ≥1 source link; the neutrality line.

- [ ] Steps: RED → implement → GREEN + suite + build → commit `feat(web): learn/gov — receipts of citizen pressure that worked`.

### Task 6: Wire the pillar + ship

**Files:**
- Modify: `frontend/src/app/learn/page.tsx` (add the four gov cards under a "The tax state, explained" section), `frontend/src/app/itsa/page.tsx` (one cross-link card), `frontend/src/app/learn/mtd-income-tax/page.tsx` (contextual link: "angry about MTD? here's who decided and how to say so" → your-levers)
- Test: extend learn index test for the new section

- [ ] Steps: RED (index test) → implement → GREEN; full three-workspace suite + typecheck + build → commit `feat(web): gov pillar wired into learn + itsa` → controller handles final review, merge to main, manual `npm run deploy` (CI CF token broken — Yu action pending), live verification of all four routes.

---

## Self-review notes

- Corpus-only rule keeps implementation honest: no researcher-agent invention at build time; gaps (full devolved-taxes guide, NI, election-effects, Welsh-language) are M2 backlog, listed in the learn index "more coming" note.
- Blockers from the critic both addressed structurally: devolution notes (T2/T2 sections) + staleness mechanism (T1, enforced by test + UI badge).
- Data protection: RoleEntry carries no personal contact data; holder names are public gov.uk facts with as-of dates.
