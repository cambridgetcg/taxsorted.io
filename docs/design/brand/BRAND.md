# TaxSorted brand: The Common Reader

This is the brand guide for TaxSorted.io. Yu approved the direction, "The Common Reader", on 2026-10-20. All the
art is hand-authored vector geometry. The editable source is the native VectorCraft master
`docs/design/brand/taxsorted-brand.vectorcraft`, and `docs/design/brand/render-brand.py` exports every asset from
it ([README](README.md)). Paths in this guide are relative to the repository root.

Status words in this guide:
- **verified**: measured or rendered, and the pixels looked at;
- **inferred**: reasoning;
- **unknown**: not checked.

Cultural readings are inferred. No native reader has checked them yet (§13).

---

## 1. Brand story

TaxSorted is a free UK tax commons. It puts the rules into plain English and works out your figures from your own
records. The mark is a reader over an open book:
- **Understood.** The open pages are the part you are reading now.
- **Sorted.** Beneath them is the binding. It is a little wider than the pages, holds the rest of the book in
  order, and gives it steady footing.
- **Never finished.** The book never closes, so the brand itself has no "done", "approved" or "filed" state.
  Product states are words with a named source (§4).
- **Not under the rules.** The reader sits above the book rather than under it.

The colours come from open-access moorland:
- heather for what you can act on, and for the brand's own mark;
- a primrose highlighter for the figure that came from your own records;
- brick only when something needs your attention, always with words.

Everything else is paper and ink, so the brand stays calm, warm and plainly not the government, with nothing to
sell. In public copy, say "free tax commons" or "plain-English tax help". Never say "public reading room",
"public service" or anything else that sounds like a council, a library service or HMRC.

**Brand line.** "Tax, understood. Then sorted." is the brand line. It is used on the social card and as the nav
tagline (`nav.tagline`, shown under the lockup from the `2xl` breakpoint). The root page title and description and
the footer line still say other things; whether they move to the brand line is an open question for Yu (§14). This
change does not alter page copy.

---

## 2. Name: TaxSorted.io, and who we are not

Yu decided on 2026-07-07 to keep the name, accepting the known risks: decision G1 in
`docs/superpowers/specs/2026-07-03-taxsorted-uk-commons-design.md` §9, based on the desk search in
`regs/research/naming-clearance.md` (2026-07-03). The nearest names:
- **MTDsorted®** (UK00003882443, owned by MTDsorted Ltd, classes 9, 35 and 42) is a registered word mark whose
  class 9 covers "tax preparation software", in the same Making Tax Digital market. The research calls it the
  biggest single legal risk to the name.
- **taxsorted.co.uk** is a live UK tax-refund business for construction (CIS) workers, run by MABI VF Ltd. It uses
  a camel-case "TaxSorted" wordmark in teal-green (observed during the design review on 2026-10-20; not re-checked
  in this change).
- **Tax-Sorted Ltd** is a separate accountancy company.

TaxSorted.io is connected to none of them. The About page names taxsorted.co.uk and Tax-Sorted Ltd.

Rules (rules 4 to 6 carry out the G1 decision):
1. **In public, the wordmark never appears without the reader mark.** Where the mark cannot fit (plain text,
   a space narrower than 90 px), write "taxsorted.io" instead of the bare word, or beside it. No standalone
   wordmark file ships for this reason (§6).
2. Never set the wordmark in teal or green, and never put it next to refund or "claim money back" promises.
3. **Disambiguation copy.** Where confusion is likely (About, press notes, app-store text, email footers, social
   bios), say once and plainly: "TaxSorted.io is not connected to taxsorted.co.uk or to Tax-Sorted Ltd."
4. In press, email and social copy, use "TaxSorted.io" or "taxsorted.io" at first mention. Name fields in
   metadata carry "TaxSorted.io": `og:site_name` and the manifest `name` and `short_name`. The social card image
   itself shows `taxsorted.io` (§8).
5. Keep "MTD" out of taglines and of any line set next to the name. The brand line has none.
6. **™ only, never ®.** TaxSorted is not a registered trade mark.

The drawn lockup reads "TaxSorted" without ".io". Whether that sits well with G1's "always present as
TaxSorted.io" is a question for Yu (§14). Formal clearance is a launch gate (§13).

---

## 3. Colour system

The site tokens live in `frontend/src/app/globals.css`: the `:root` block, exposed to Tailwind as `--color-*`
through `@theme inline`. This table is that block, with each token's value before this change. Contrast figures
are WCAG 2.x ratios from `contrast.py` (§15).

| Token | Before | Now | Role | Key contrast |
|---|---|---|---|---|
| `paper` | `#f7f4ee` | `#f7f4ee` | Page ground; the focus halo | ink on it 14.47 |
| `surface` | `#fffdf9` | `#fffdf9` | Cards, nav | ink 15.64 |
| `surface-muted` | `#efebe3` | `#efebe3` | Quieter panels | ink 13.36; heather 5.10 |
| `ink` | `#20231f` | `#20231f` | Text; the mark's pages and binding; status labels; large dark panels | 14.47 on paper |
| `ink-soft` | `#62675f` | `#4f534c` | Secondary text (AAA); neutral bullets and icons | 7.15 paper, 7.85 white |
| `ink-faint` | `#70756e` | `#62675f` | Placeholders, tertiary text | 5.28 paper, 5.79 white |
| `accent` | `#305b4b` | `#86507e` | **Heather**: action and identity (below) | 5.52 paper, 6.07 white; white on it 6.07 |
| `accent-deep` | `#234638` | `#581b3e` | **Mulberry**: hover and pressed, small solids only | 11.66 paper; white on it 12.79 |
| `accent-soft` | `#e5ede8` | `#f4eaf0` | **Heather wash**: callouts, active nav, `::selection` | ink 13.52; heather 5.16 |
| `warm` | `#b54a3a` | `#9b3d27` | **Brick**: the one "needs attention" colour, always with words | 6.19 paper |
| `gold` | `#8a6b2c` | `#eee7ad` | **Primrose**: a highlighter behind ink, never text. The old gold text colour is retired; no utility used it | ink on it 12.61 |
| `line` | `#ded8cd` | `#ded8cd` | **Decorative hairline**: card borders, `divide-*`, `.hairline-grid`, `bg-line` fills | 1.29 paper (decorative only) |
| `line-strong` | `#c9c1b5` | `#827d71` | **Control edge**: form fields, secondary pills, `decoration-line-strong` underlines, hover borders | 3.74 paper, 4.10 white; lowest 3.45 on surface-muted |
| `--ts-mark-reader` | — | `var(--accent)` | The mark's second tone; `currentColor` under `forced-colors: active` (§6). Not a Tailwind colour | — |

Tailwind's stock `white` stays in use for legacy cards and inputs. The body's two corner glows are recomputed at
the same alphas: heather `rgb(134 80 126 / 0.07)` at 8% 2% and brick `rgb(155 61 39 / 0.045)` at 92% 7%.

**Line strategy.** The approved design files moved `line` to the control-edge value and added a `rule` token for
hairlines. This change does the reverse, so the roughly 890 decorative `*-line` uses stay untouched:
- `line` stays the decorative hairline;
- `line-strong` becomes the control edge (WCAG 1.4.11, at least 3:1 on every light ground);
- form controls that used `border-line` now use `border-line-strong` (§11). Controls already on `border-ink-soft`
  (7.85:1) are unchanged;
- there is **no `rule` token**.

The cost: secondary pills draw their edge at 3.74–4.10 rather than the design files' 4.90 (`#6f6a5f`). In return,
link underlines stay lighter than the heather text.

**Artwork-only colour.** `dark-accent` `#ac72a3` is heather lifted for dark grounds: 4.31:1 on ink, for non-text
use only. It is not a CSS token. It is used in:
- the Reversed and Local colourings (§5);
- `exports/lockup-dark.svg` and `exports/lockup-small-dark.svg`;
- `desktop/assets/icon.svg`;
- the dark-scheme tile in `frontend/src/app/icon.svg`.

On ink, text is paper or white (14.47, 15.89), and secondary text is paper at 75% (8.71).

The master's six global swatches carry the same values:

| Swatch | Value |
|---|---|
| Brand ink | `#20231f` |
| Brand heather | `#86507e` |
| Brand paper | `#f7f4ee` |
| Brand ink soft | `#4f534c` |
| Brand primrose | `#eee7ad` |
| Brand dark accent | `#ac72a3` |

`render-brand.py` reads its colours from these swatches. Change a token and its swatch together, then
re-export.

**Heather marks action and identity.**
- Action: links, primary buttons, the focus ring.
- Identity: the mark's reader and the icon tile.
- Non-actionable heather text belongs only on eyebrows (`.section-label`).
- Heather should never mark a status. **This is not yet true everywhere.** The token swap turned every status
  that used the old evergreen accent into a heather one. Those places are known exceptions, listed in §12.8, and
  wait for the status-vocabulary follow-up.

**Never-pair rules:**
- Heather and primrose never touch. Purple with yellow reads as UKIP, and purple with gold reads royal.
- Never put primrose figures on ink, because it reads as gold bars.
- Brick never sits on heather.
- **Brick and primrose never share a component.**
- **A person's name is never in brick or red.**
- Mulberry is never used for large panels; use ink.
- **No colour alone ever carries a status** (WCAG 1.4.1). Red means "up" to mainland Chinese readers, and green
  means approved or "go" in the UK. §4 gives the words.

**Heather in the landscape.** The nearest observed brand colours to heather:

| Brand | Colour | dE2000 from heather | Source of the figure |
|---|---|---|---|
| FreeAgent | `#7e328f` | 10.6 | recomputed for this guide |
| MoneyHelper | pink-600 | 13.3 | design review; not re-measured here |
| GOV.UK | magenta | 14.3 | design review; not re-measured here (the older GOV.UK Frontend magenta `#d53880` measures 16.1) |

MoneyHelper is the government-backed Money and Pensions Service, so it is part of the landscape launch check
(§13).

---

## 4. Patterns that carry meaning

Only the focus rule ships as shared CSS in this change. The other rows are the spec for the follow-up (§12). Some
components already use the attention colours, but none of these patterns is a shared class or component yet.

| Pattern | Spec | Meaning |
|---|---|---|
| **Focus** (shipped; one rule, every ground) | `:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; box-shadow: 0 0 0 3px var(--paper); }`. It sits outside Tailwind's layers, so it beats every focus utility. Change focus here, never with utilities | Heather ring on a paper halo, legible on paper, cards, heather and ink |
| **Links** | heather and always underlined; hover: mulberry with a 2px underline; `:visited` keeps the same heather | The underline carries link identity |
| **Primrose highlighter** | `background: linear-gradient(transparent 54%, var(--gold) 54% 92%, transparent 92%); box-decoration-break: clone;` Ink text only | One phrase per view: "understood." or a derived figure. Non-Latin stops are unverified |
| **Provenance** | primrose band under the figure, "From your records, not typed in … derived from N entries", "see how" | "Derive, never key", made visible. It never says "correct" |
| **Boundary note** | paper or surface-muted ground, `1.5px dashed var(--line-strong)` border, mono caps word label (`NOT LIVE`, `PREVIEW · NOT FINAL`, `ON THIS DEVICE`), ink text | Shape, not colour, says "not final" |
| **Attention** | `warm/5` tint, `warm/40` border, brick label in words ("Needs attention"), ink body | The only alarm-adjacent colour, never without words |
| **Amounts** | The figure in ink; direction and date in words beside it: "You owe HMRC £1,240 · due 31 January 2027", "HMRC owes you £86". Overdue is said in words ("Overdue since 1 February") with the attention pattern next to the figure | Never brick, red or green on the figure itself, and never a sign or arrow alone to carry direction |

### Status vocabulary

This is an internal product spec, not marketing material. The design board that illustrated it is internal and
is not in this repo; its sample references and dates were placeholders.

Every status is **words plus an edge shape**. It is never a tick, never green and never heather.
- **Edge:** `1.5px` in `line-strong` (3.74:1 on paper). **Dashed means not final.** **Solid means recorded by a
  named party, with that party's evidence**: who did it, when, and their reference.
- **Not-final states** use a short mono caps label (`.section-label` metrics, ink) with a plain line under it in
  ink-soft.
- **Recorded states** are written as a sentence-case attribution, never as a caps stamp box: "Received by HMRC on
  3 February 2027. Reference XYZ123." TaxSorted never asserts a recorded state on its own authority.

| State | Edge | How it reads | When it may appear |
|---|---|---|---|
| Draft | dashed | `DRAFT` · "Not final." | always |
| Prepared | dashed | `PREPARED` · "Worked out on this device. Nothing sent." | figures derived on this device |
| Sandbox test | dashed | `SANDBOX TEST` · "Not a real filing." | HMRC sandbox submissions only |
| Declared by you | solid | "Declared by you on 12 January 2027." | after the person confirms the figures. Never the bare word "approved" |
| Submitted | dashed | `SUBMITTED` · "Waiting for HMRC." | **only once production filing is live** |
| Received | solid | "Received by HMRC on 3 February 2027. Reference …" | only when HMRC returns a receipt. Every HMRC receipt maps to this state and no other |
| Accepted | solid | "Accepted for processing by HMRC on 3 February 2027. This is not a check of your figures." | only when HMRC's response literally reports success |
| Paid | solid | "Payment of £1,240 recorded by you on 30 January 2027." or "… shown by HMRC on …" | names who recorded the payment and their evidence |
| Corrected | solid | "Corrected by you on 4 March 2027. Replaces the version from 3 February." | after an amendment; the earlier version stays visible |
| Problem | attention | "Needs attention", then what happened and what to do | any time |

Production filing is not live, so `SUBMITTED`, Received and Accepted are specified for later. They must not
appear in the product until they are true.

---

## 5. The mark

### Construction (32-unit grid, `viewBox="0 0 32 32"`, axis x = 16, mirror-symmetric)

- **Reader:** a circle, centre (16, 7), r 4.25, spanning y 2.75–11.25. That is 31% of the mark's width.
- **Pages:** two mirrored open pages. The outer edges are at x 4 / 28 and the gutter is 2 units (x 15–17).
  - **Top edge:** an arc of radius 22 centred directly below the outer top corner (4, 13.25). The page is level at
    its outer edge and curls 2.95 units down into the gutter.
  - **Bottom edge:** the same arc, 8.25 units lower.
  - **Corners:** the outer corners have 1.25-unit fillets.
- **Binding:**
  - It follows the same arcs, 2 units below the pages, and is 2.5 units thick.
  - It runs flat 1.5 units beyond the pages (outer edges x 2.5 / 29.5), as a hardback's boards do.
  - The outer bottom corner has a 0.75 fillet.
  - Outer edge y 23.5–26, where y 26 is the lockup baseline. At the gutter, y 26.45–28.95.
- **Glyph box:** x 2.5–29.5, y 2.75–28.95 (27 × 26.2).
- **Colouring:** the pages and binding are one `currentColor` path. The reader is
  `var(--ts-mark-reader, currentColor)`, so an `<img>` or a missing variable gives the one-colour mark. There are
  no transforms.
- **Source of truth:** `frontend/src/components/brand/TaxSortedMark.tsx` holds this geometry. `render-brand.py`
  stops if the master's "Common Reader" symbol differs from it in shape, size or position.

### Small drawing (16-unit grid)

The same three parts, drawn for the pixel grid with straight edges (`TaxSortedMark size="small"`,
`docs/design/brand/exports/mark-small.svg`, master symbol "Common Reader small"):
- **Reader:** r 2 at (8, 4), exactly the 4×4 px box x 6–10, y 2–6.
- **Pages:** `M7 8.5L3 7V10.5L7 12Z` and its mirror. The outer verticals are at x 3 / 13 and the gutter at x 7–9.
- **Binding:** `M7 13L2 11.125V12.625L7 14.5Z` and its mirror. It sits 1 px below the pages, is 1.5 px thick and
  extends 1 px wider.
- **Glyph box:** x 2–14, y 2–14.5 (12 × 12.5).

### Colourings (only these)

| Colouring | Pages + binding | Reader | Ground |
|---|---|---|---|
| Full | ink | heather | paper, surface, white |
| Reversed | paper | dark-accent | ink |
| Tile | paper | paper | heather tile (dark-accent in the dark scheme) |
| Local | paper | dark-accent | ink tile with a faint paper rim |
| One colour | `currentColor` | `currentColor` | anything with at least 3:1 |

### Clear space and minimum sizes

- **Clear space:** one reader-dot diameter on every side.
- **Marks are measured by glyph height**, the painted height from the reader's top to the binding's lowest point,
  not by the box they sit in.
  - Regular drawing: **24 px glyph height or more**. In `TaxSortedMark` the glyph is 26.2/32 of the box, so the
    box must be at least 30 px.
  - Small drawing (`size="small"`): **16–23 px glyph height**. Its glyph is 12.5/16 of the box, so boxes of
    21–29 px.
  - Never below 16 px glyph height.
- **Lockups are measured by width:** `TaxSortedLockup` at **180 px wide or more** (the mark is then at least 24 px
  tall). From **90 to 179 px**, use `size="small"`, which is pixel-exact at 91 px wide. Below 90 px, use a tiled
  icon or the small mark alone.
- **Tiled icons have their own rule, by tile size.** Tiles of 16–48 px carry the small drawing (the favicon frames
  and `frontend/src/app/icon.svg`). Tiles of 180 px and up carry the regular drawing (Apple icon, PWA icons, the
  256 favicon frame, the Local icon).

---

## 6. Lockups

**Construction (regular):** the mark is set like a letter.
- The reader's top sits on the wordmark's ascender line.
- The binding's outer bottom sits on the baseline, and the gutter dips below it like a descender.
- The mark is 1.14× cap height; the gap is 0.40× cap height, measured from outlined glyph bounds.
- At 1×, the regular lockup is 248 × 46 and the small one 91 × 19, with the 16-grid drawing at exactly 1 px per
  unit.

| File | Encoding | Use it for |
|---|---|---|
| `TaxSortedLockup` (`frontend/src/components/brand/TaxSortedLockup.tsx`) | inline, `currentColor` + `--ts-mark-reader` | **site nav and footer** (default); `size="small"` for 90–179 px |
| `exports/lockup-mono.svg`, `exports/lockup-small-mono.svg` | `currentColor` + `--ts-mark-reader` | inline SVG where React is not available |
| `exports/lockup.svg`, `exports/lockup-small.svg` | fixed ink + heather | `<img>` on paper, surface or white |
| `exports/lockup-dark.svg`, `exports/lockup-small-dark.svg` | fixed paper + dark-accent | `<img>` on ink |
| `exports/lockup.png`, `exports/lockup@2x.png` | opaque paper plate with clear space (258 × 56, 516 × 112) | email, documents, press. An opaque plate survives mail clients that invert or recolour transparent images |
| `exports/lockup-dark.png`, `exports/lockup-dark@2x.png` | opaque ink plate | the same, in dark layouts |
| `exports/mark.svg`, `exports/mark-small.svg` | `currentColor` + `--ts-mark-reader` | the mark alone where React is not available |

`exports/` means `docs/design/brand/exports/`. There is no standalone wordmark file (§2). The master keeps a
Wordmark artboard for the rare layout that must set the word apart from the mark.

**Nav** (`frontend/src/components/site-nav.tsx`), as shipped:

```tsx
<Link href="/" className="flex min-h-11 w-min flex-col items-start justify-center self-center text-ink">
  <span className="sr-only">TaxSorted</span>
  <TaxSortedLockup size="small" className="h-8 w-auto sm:hidden" />
  <TaxSortedLockup className="hidden h-9 w-auto sm:block" />
  <span className="hidden text-xs text-ink-soft 2xl:inline">{t("nav.tagline")}</span>
</Link>
```

- The link is named by hidden text, so it reads "TaxSorted" in every locale. Both drawings stay `aria-hidden`.
- **Below `sm`:** the small lockup at 153 × 32, so the menu button still fits beside it on a 320 px phone.
- **From `sm`:** the regular lockup at 194 × 36, inside the 44 px target.
- **From `2xl`:** the tagline sits under the lockup, never beside it. `w-min` holds the link to the lockup's
  194 px, so a longer tagline breaks onto two lines (Polish) instead of widening the link.
- **Fit.** The content row is 1,216 px from `xl` up, and the door row is widest in Polish. The language select is
  `field-sizing-content`, so it is as wide as the chosen language rather than the longest option
  ("繁體中文 / 廣東話"). Measured in Chromium and WebKit on the built site (verified, 2026-10-21): in all six
  locales at 1280, 1366, 1440, 1536 and 1920 px, the doors stay on one row beside the lockup. The header is 75 px,
  or 89 px for Polish from `2xl` where its tagline takes two lines; both clear the 104 px `scroll-padding-top`.
  The narrowest margin is Polish at `xl`: 41 px in Chromium, 48 px in WebKit. Below `xl` the header is 65 px with
  no overflow at 320, 375, 640, 768 and 1024 px.
- **Without `field-sizing`** (Firefox, as far as is known; not run), the select keeps its 167 px width and Polish
  wraps to two rows from 1280 px: a 127 px header at `xl` and 151 px at `2xl`, so anchor targets land up to 47 px
  under it. Main already wrapped Polish at `2xl` (127 px). This was simulated in Chromium, not run in Firefox
  (§12).

**Footer** (`frontend/src/app/layout.tsx`): the small lockup at its native 91 × 19 (`h-4.75`), decorative and in
ink, above the footer line.

**Rules:**
- **`--ts-mark-reader` is set in one place only, `:root` in `globals.css`**, together with its forced-colours
  override:
  ```css
  :root { --ts-mark-reader: var(--accent); }
  @media (forced-colors: active) { :root { --ts-mark-reader: currentColor; } }
  ```
  Components, the nav and other wrappers never set it. A local declaration would shadow the forced-colours
  override and leave a heather dot on a forced-colours ground. `site-nav.test.tsx` checks that the nav never
  declares it. Under Chromium's forced-colours emulation (2026-10-20, at 1440 and 390 px) the nav lockup drew the
  reader and the letters in the same system colour, as intended. A real Windows contrast theme is **unknown**.
- **Never** use a fixed-colour `<img>` lockup in the nav: on a black forced-colours Canvas it disappears (ink on
  black is 1.32:1).
- Never put the full-colour lockup on heather or mulberry. Use the one-colour lockup there.
- **RTL (Urdu):** the lockup sits at the start, on the right, and is never mirrored.
- **Localised taglines** go beside the lockup in Noto (CJK, Devanagari, Nastaliq), never inside the artwork.

---

## 7. Icons

| File | Use | Notes |
|---|---|---|
| `frontend/src/app/favicon.ico` | tab icon fallback | Four frames, transparent corners. 16, 32 and 48 are the small drawing on the rounded heather tile at 1×, 2× and 3×, so the gutter and outer page edges land on whole pixels. 256 is the regular drawing on the tile |
| `frontend/src/app/icon.svg` | tab icon | The small drawing on the tile. Under `prefers-color-scheme: dark` the tile lifts to dark-accent. It is the only file named `icon.svg`; no 512 tile SVG ships beside it |
| `frontend/src/app/apple-icon.png` | home screen (iOS) | 180 × 180, opaque, full-bleed heather |
| `frontend/public/icons/icon-192.png`, `icon-512.png` | manifest `purpose: "any"` | Rounded heather tile (rx 112 at 512), transparent corners |
| `frontend/public/icons/maskable-192.png`, `maskable-512.png` | manifest `purpose: "maskable"` | Full bleed. Nothing but ground outside the central 80% circle (verified) |
| `frontend/src/app/manifest.ts` | web app manifest | Static (`force-static`). Name and short name "TaxSorted.io" (§2), `display: "browser"`, background and theme `#f7f4ee`, the four icons above. Its description repeats the root layout's; keep the two in step |
| `desktop/assets/icon.png` (1024), `desktop/assets/icon.svg` | TaxSorted Local | Apple's grid: an 824 tile at (100, 100) with rx 185 on a 1024 canvas. Ink tile, paper pages, dark-accent reader. A faint paper rim (8 px at 18%) keeps the tile's edge on a dark Dock; a soft shadow (30% black, 10 px down, 20 px blur) sits in the margin. No tick. electron-builder uses the PNG for macOS, Windows and Linux; the window background in `desktop/src/main.cjs` stays `#f7f4ee` |

Which file a browser picks (ICO or SVG), and whether it honours the dark-scheme query in a favicon, is
**unknown**. Launcher masks and Dock rendering are **unknown** (composited on flat grounds only).

---

## 8. Social card and page metadata

`frontend/src/app/opengraph-image.png` (1200 × 630, opaque) is the one social card. Next copies it into
`twitter:image`, so no separate X image ships. It is centred, so a square centre crop (x 285–915) keeps everything
that matters:
- the lockup;
- "Tax, understood. / Then sorted." in Georgia Bold, 70 px, with a primrose band behind "understood.";
- "Free UK tax help in plain English. / Money records stay on your device." in Inter, 36 px (12 px when the card
  is shown 400 px wide);
- `taxsorted.io`, kept for disambiguation (§2).

It makes no HMRC claim and has no tick. The alt text, in `opengraph-image.alt.txt`, is also copied to X:
"TaxSorted: Tax, understood. Then sorted. Free UK tax help in plain English. Money records stay on your device."

The root layout (`frontend/src/app/layout.tsx`) sets:
- `metadataBase: new URL("https://taxsorted.io")`, so image URLs are absolute;
- `openGraph: { type: "website", siteName: "TaxSorted.io", locale: "en_GB" }`;
- `twitter: { card: "summary_large_image" }`;
- `viewport`: `themeColor: "#f7f4ee"`, `colorScheme: "light"`.

It sets no social title or description, so Next fills them from each page's own. There is no `title.template`;
page titles are unchanged.

There is **no `og:url`**. A root `url: "./"` resolved on the 404 page to Next's internal
`https://taxsorted.io/_not-found/`, an address that serves the 404 content with a 200 status. Without `og:url`,
social sites use the address they fetched.

**A route that sets its own `openGraph` replaces the root's whole object, image included.** No route does now:
`frontend/src/app/uk/personal-tax/layout.tsx` had one and lost the card, so its override was removed; the page
keeps its canonical link.

Verified in the built HTML (2026-10-21): all 81 pages carry an absolute `og:image` (1200 × 630, with
`og:image:alt`), the same `twitter:image` and alt, `twitter:card` `summary_large_image`, `og:site_name`
"TaxSorted.io", `og:locale` `en_GB`, the theme-color and color-scheme metas, the favicon, `icon.svg` and
apple-touch-icon links, and `<link rel="manifest">`. None carries `og:url`.

---

## 9. Typography

- **Wordmark:** "TaxSorted", one word with a capital T and S.
  - Inter SemiBold (the named instance) at −14/1000 tracking, with Inter's kerning.
  - Always outlined artwork: a lockup or `TaxSortedLockup`. Never retype it, set it in capitals or split it.
- **Site:** the system sans stack for UI and body text, and Georgia/Noto Serif for humane prompts and titles:
  - no webfont cost;
  - the system and Noto fallbacks already cover CJK, Devanagari and Nastaliq;
  - Georgia is warm and plainly not GDS Transport.
- **Mono caps:** the eyebrow voice (heather) and the status/boundary label voice (ink).

---

## 10. Do and don't

**Do**
- State boundaries in words: "Production filing with HMRC is not live."
- Keep "prepared", "declared", "submitted", "received", "accepted", "paid" and "corrected" as separate words,
  using the §4 vocabulary.
- Use one primrose highlight per view, always under ink.
- Use the inline `currentColor` lockup in the nav and footer.
- Keep large dark panels in ink.

**Don't**
- **Never imply HMRC approval, endorsement or recognition.** No crown, crest, portcullis, GDS Transport, black or
  blue header bar, yellow `#ffdd00` focus fill or green "Start now ▸" button.
- **Never describe TaxSorted, its figures or its outputs as "official".** Use "official" only for a named, linked
  source: HMRC, GOV.UK or legislation.gov.uk, for example "HMRC's official guidance" with the link.
- **No tick as status, ever.** That covers the mark, badges, success screens and list bullets. Do not add a tick,
  seal, stamp, shield, crown, envelope, £ or arrow to the mark. Never close the book or show it "complete".
- **No green and no heather for status** (§3).
- **Never present the mark as signage or a wayfinding pictogram.** No white-on-blue, white-on-green or
  white-on-brown square, no "i", no arrow, no sign plate, and no "information", "help point" or "library" label
  beside it. It is not a council, library or government symbol.
- Do not say "public reading room" or "public service" in public copy.
- Do not draw ledger lines, figures or text on the pages.
- Brick never stands without words. Primrose is never text.
- Do not recolour the mark in brick, primrose, red or green. Do not mirror, skew or rotate it, and keep to the
  minimum sizes (§5).
- Use no countdowns, alarm red or exclamation marks.

---

## 11. Implementation map (this change)

Owner scope: the brand, plus a safe UI pass. That covers tokens, the lockup in nav and footer, icons, manifest,
social card and metadata, the desktop icon, and only the migrations the colour change forces.

| Piece | Files |
|---|---|
| Tokens, mark reader variable, focus ring, body glows | `frontend/src/app/globals.css` |
| Mark and lockup components | `frontend/src/components/brand/TaxSortedMark.tsx`, `TaxSortedLockup.tsx`; drift test `frontend/src/components/brand/__tests__/brand-geometry.test.tsx` |
| Nav lockup (§6) | `frontend/src/components/site-nav.tsx`; test `frontend/src/components/__tests__/site-nav.test.tsx`; the select width in `frontend/src/i18n/LanguageSwitcher.tsx` |
| Footer lockup, metadata, viewport (§8) | `frontend/src/app/layout.tsx`; the `openGraph` override removed from `frontend/src/app/uk/personal-tax/layout.tsx` |
| Manifest | `frontend/src/app/manifest.ts` |
| Tab and home-screen icons | `frontend/src/app/favicon.ico`, `icon.svg`, `apple-icon.png`; `frontend/public/icons/{icon,maskable}-{192,512}.png` |
| Social card | `frontend/src/app/opengraph-image.png` and `opengraph-image.alt.txt` |
| Desktop icon | `desktop/assets/icon.png`, `desktop/assets/icon.svg` |
| Brand source, script, exports, this guide | `docs/design/brand/` |
| Removed (no references) | `frontend/public/{file,globe,next,vercel,window}.svg` |

**Migrations the colour change forces** (all in `frontend/src/`):
1. **Control edge.** `border-line` becomes `border-line-strong` on 33 form controls in 17 files. Radios and
   checkboxes are excluded. The shared `fieldClass` in `app/prepare/employment-card.tsx`, used by 11 more
   controls, changes the same way.
2. **Focus.** The global rule gains its paper halo (§4). The two `/plan` amount inputs (`app/plan/plan-client.tsx`)
   lose `outline-none focus:ring-2 focus:ring-accent/20`; they keep `focus:border-accent`.
3. **Ticks that would have turned heather.**
   - List-bullet ticks become neutral `bg-ink-soft` dots in `app/home-client.tsx`, `app/books/page.tsx` (a ✓
     glyph), `app/download/page.tsx` and `app/services/[audience]/page.tsx`.
   - The home step icons (`app/home-client.tsx`) go from `text-accent` to `text-ink-soft`.
   - The VAT completion view (`app/vat/[entityId]/submit/submit-page-client.tsx`) loses its heather: the
     `CheckCircle2` goes from `text-accent` to `text-ink-soft`, the panel from `bg-accent-soft` to `bg-surface`,
     and the "Local calculation complete" label from `text-accent` to `text-ink`. The icon and the success
     layout stay until the follow-up replaces them with the `PREPARED` boundary note (§12).
   - Checks inside real checkbox controls (`components/ui/checkbox.tsx`, `app/checkup/checkup-client.tsx`) stay,
     because they show the person's own input.
4. **Large panel.** The home audience panel goes from `bg-accent-deep` to `bg-ink`. No other non-hover
   `bg-accent-deep` remains.
5. **Contrast repair.** The selected-card eyebrow in `app/uk/politics/stand/stand-guide.tsx` goes from
   `text-white/70` to `text-white/90`: on heather that is 5.29:1, where white/70 was 3.89.
6. **Placeholders.** `placeholder:text-ink-soft` becomes `placeholder:text-ink-faint` in `components/ui/input.tsx`,
   `app/tools/mileage/mileage-client.tsx` and `components/tax-expert/PersonalThresholdCheck.tsx`. `ink-faint` now
   has the old `ink-soft` value, so placeholders look as they did and stay lighter than entered figures.
7. **No old hard-coded brand colours** remain in `frontend/src` or `frontend/public/media`.
8. **Emerald beside heather.** Emerald read as one family with the old evergreen; next to heather it is a second
   accent. The two most visible uses move to the brand: the "Start with the change" card on `/uk/politics`
   (`app/uk/politics/page.tsx`) becomes a light card (`border-line bg-surface`, heather eyebrow and link), and the
   "Verify the live official window" button in `app/uk/politics/decisions/decision-guide.tsx` goes from
   `bg-emerald-900` to `bg-accent hover:bg-accent-deep`. The rest waits for §12.5.

---

## 12. Follow-ups (not in this change)

**Status vocabulary** (the agreed follow-up; §4). All paths are under `frontend/src/`:
1. `components/ui/badge.tsx`: replace the `success`, `warning`, `error` and `info` variants with §4 words and
   edges. Users include "Business checked" in `features/books/records-client.tsx` and "All rounds completed" in
   `components/learn/learning-playground.tsx`.
2. **Status ticks** (none is heather now):
   - `app/vat/file/file-client.tsx:102` ("Filed. Receipted.");
   - `components/vat/vat-obligations-list.tsx:118`, `vat-return-form.tsx:367`, `vat-connection-card.tsx:24`;
   - `components/dashboard/hmrc-connections.tsx:26`, `recent-submissions.tsx:27, 60, 152`,
     `attention-required.tsx:169`, `entity-header.tsx:148`;
   - `components/prep/quarter-card.tsx:187` ("Copied for checking ✓");
   - the now-neutral `CheckCircle2` at `app/vat/[entityId]/submit/submit-page-client.tsx:250` and the home step
     icons.

   ✓ glyph bullets: `app/uk/public-funding/page.tsx:437-440`, `app/uk/politics/people/people-directory.tsx:320-323`
   and `app/uk/politics/method/page.tsx:70`.
3. **Warning icons:** 8 uses in 7 files, replaced by the attention pattern and words:
   - `components/vat/vat-obligations-list.tsx:120`, `vat-connection-card.tsx:31`, `vat-liabilities-card.tsx:139`,
     `vat-return-form.tsx:359`;
   - `components/dashboard/hmrc-connections.tsx:37, 86`, `attention-required.tsx:64`, `compliance-score.tsx:131`.
4. **Amounts pattern.** Build it, then move `components/vat/vat-liabilities-card.tsx` onto it:
   - the outstanding total in `text-red-600`/`text-green-600` (line 67);
   - the overdue amount in `text-red-600` (line 155);
   - the red and green trend arrows (lines 58 and 60).
5. **Green and emerald utilities:** 94 class uses in 27 files (counted 2026-10-21). Remove them where they signal
   status, such as "Filed", green ticks, the compliance-score traffic light, ledger and records states, and
   learning feedback. Those still most visible beside heather:
   - the `emerald-50` dated-window panels in `app/uk/politics/decisions/decision-guide.tsx:342-360`, whose button
     is now heather (§11.8);
   - the `text-emerald-200` eyebrow on the ink hero at `app/uk/public-funding/page.tsx:331`;
   - `emerald-50` callouts in haworth-v-hmrc, opportunities/[slug], public-funding, regulator-scrutiny and cases.
6. **Two error reds.** Stock `red-600`/`red-700` errors (mileage, PersonalThresholdCheck, csv-import,
   eligibility-form) now differ from the brick `text-warm` errors on `/plan`. Move all of them to the attention
   pattern.
7. **Sandbox notes become boundary notes.** That is about 65 `amber-50` notes, plus the yellow warning badges.
8. **Heather status.** The token swap left heather marking a status in these places (the exceptions §3 names).
   Where heather sits beside amber, grey, sky or rose, the tint alone separates the states:
   - `components/services/service-card.tsx:6`: `available` is a heather wash, against grey `guidance` and amber
     `sandbox` (on `/services` and the audience pages);
   - `app/books/page.tsx:169`: the audience status chips ("Open now", "Bounded tools open", "Not yet");
   - `app/books/connect/page.tsx:59, 73`: "Available now" chips;
   - `app/plan/page.tsx:92`: status eyebrows in heather caps ("Bounded check open", "Not yet", "Review required");
   - `app/uk/politics/integrity/page.tsx:27`: `Live` is heather, against amber `Review gate` and sky `Mapped`;
   - `components/tax-expert/MtdExpertCheck.tsx:272`: a `determined` answer gets a heather panel, against amber
     `needs_facts` and rose for the rest: a traffic light with heather as "answer";
   - `app/uk/tax-industry/page.tsx:657`: access and official status in heather caps;
   - `app/trust/page.tsx:62`: the boundary state labels ("Production filing not live", "Browser-local" …).

   All of them move to the §4 words-plus-edge vocabulary: mono caps ink labels, dashed where the state is a limit.
   The VAT completion view, which the approved design files said must change with the tokens, lost its heather in
   this change (§11.3); its tick and success layout remain for this follow-up.
9. **`/vat` and `/dashboard`:** migrate them, or hide them from navigation until they are migrated (Yu, §14).

**Patterns not yet built:** links (hover underline and `:visited`), the primrose highlighter and provenance
band, the boundary note and attention components, and amounts (§4). No highlighter CSS ships in this change.

**Contrast and colour found during this change:**
- `ApiLink` (`app/uk/politics/integrity/page.tsx:39`) is used inside the `bg-ink` paragraph at `:479`, where
  heather on ink is 2.62:1. This failure predates the change (the old green was 2.06). Links on ink panels need a
  light link style.
- Link underlines in `decoration-line` (`#ded8cd`, 1.29:1) appear on 28 lines. On ink-coloured links the
  underline is the only link cue, so move these four to `decoration-line-strong`:
  - `app/uk/politics/people/people-directory.tsx:522`;
  - `app/uk/politics/api/page.tsx:328`;
  - `app/uk/tax-identity/page.tsx:1047`;
  - `app/uk/public-funding/page.tsx:813`.
- Heather used as data: the meter fill at `app/uk/politics/integrity/page.tsx:283` is `bg-accent`. It passes, but
  heather means action, so consider `bg-ink-soft`.

**Cleanup.** The unlayered global rule always overrides `focus-visible:outline-*` and `focus-visible:ring-*`
utilities, so they are dead code. Remove them from 16 files:
- `components/ui/button.tsx`, `components/ui/input.tsx`;
- `components/prep/`: money-inbox, ledger, record-form, cited, eligibility-form;
- `components/tax-expert/`: PersonalThresholdCheck, MtdExpertCheck;
- `app/uk/tax-expert/page.tsx`, `app/uk/personal-tax/page.tsx`, `app/uk/politics/people/people-directory.tsx`;
- `app/tools/mileage/mileage-client.tsx`, `app/checkup/tax-year-progress.tsx`, `app/download/page.tsx`;
- `app/home-client.tsx` (`focus-visible:outline-white`).

Plain `focus:` utilities, such as those on `<main>` in `app/layout.tsx` and in haworth-v-hmrc, still apply when
focus is not keyboard-visible. They are not dead code.

**Metadata and platform:**
- TaxSorted Local: `desktop/src/local-protocol.cjs` has no `.webmanifest` content type, and the page CSP has no
  `manifest-src`. Electron probably never fetches the manifest, but it may log console noise (inferred).
- `next build` runs webpack (`next build --webpack`), and the manifest link is verified in its output (§8). Under
  Turbopack, which only `next dev` would use, it is unverified.
- `frontend/out/_not-found/index.html` serves the 404 content with a 200 status. That is Next's static export, not
  this change; it no longer matters for sharing because no page names it in `og:url` (§8).

**Nav:**
- Browsers without `field-sizing` (Firefox, as far as is known) wrap the Polish nav from 1280 px (§6). Run the nav
  in Firefox at 1280 and 1536 px. If it wraps, either set `scroll-padding-top` from the header's real height
  rather than the fixed 6.5rem, or trim the door row.
- The `lg:sticky lg:top-24` panels (`app/checkup/checkup-client.tsx:226`,
  `app/uk/politics/people/people-directory.tsx:312`) assume a header under 96 px. Every measured case is 89 px or
  less; the Firefox Polish case above is not.

**Still to check** (open after the runs in §15):
- the focus halo on heather pills, and the secondary pill edges, looked at directly (the halo was checked on the
  home link, a primary button, the home ink panel and the menu button);
- the nav in Firefox (above);
- electron-builder's icon conversion per platform;
- the macOS Dock and macOS 26 icon treatment;
- launcher masks;
- which favicon a browser picks, and the dark-scheme query;
- a real Windows contrast theme (only Chromium's forced-colours emulation has run);
- opening and saving the master in the VectorCraft desktop app.

`contrast.py`, the contrast pairs file and the stock-silhouette (IoU) check live outside the repository, with the
approved design files. Commit them, or fold them into `render-brand.py`, so the contrast check can be repeated from
the repo.

**Copy:** whether the root title, description and footer line move to the brand line (Yu, §14).

**Launch gates** (§13): name and word-mark clearance, mark clearance, the five-second test in six locales,
native-reader checks (including the test translations), and the landscape check.

---

## 13. Launch gates

These need people, not pixels. Only the name has had a first look.
- **Name and word-mark clearance.**
  - Done: a desk search of TMView, which UKIPO feeds, on 2026-07-03 found no "TaxSorted", "Tax Sorted" or
    "Tax-Sorted" mark in the UK or in any other office. It found MTDsorted® (§2). Yu kept the name on 2026-07-07
    with that risk accepted (G1). Both are recorded in `regs/research/naming-clearance.md` and the G1 decision.
  - Not done: a formal clearance at UKIPO and EUIPO in classes 9 (software), 35 (tax preparation and filing
    services, where MTDsorted® is registered), 36 (financial and tax services) and 42 (online software services),
    against MTDsorted®, taxsorted.co.uk and Tax-Sorted Ltd. It is needed before any trade-mark filing or paid
    promotion. The research suggests a UK application as a cheap stress test; G1 leaves that undecided.
- **Mark clearance** for the reader-over-book mark, including education and charity marks and the stock icon sets
  (Font Awesome, Material, Flaticon, Noun Project). Not done. While the mark was designed, its silhouette overlap
  (IoU) with Font Awesome's `book-open-reader` measured 0.71: the same family. The lockup is the more protectable
  unit.
- **Five-second test** with sole traders, landlords and first-time filers, the mark alone and in the lockup, in all
  six locales. Ask: "Does this look like a working tax tool?" and then, explicitly:

  | Locale | Question |
  |---|---|
  | English | Does this look like a council, library or government service? |
  | 繁體中文 (Cantonese voice) | 呢個睇落似唔似地方議會、圖書館或者政府嘅服務？ |
  | 简体中文 | 这看起来像地方议会、图书馆或政府的服务吗？ |
  | Polski | Czy to wygląda na usługę samorządu, biblioteki albo administracji rządowej? |
  | हिन्दी | क्या यह किसी स्थानीय परिषद, पुस्तकालय या सरकारी सेवा जैसा दिखता है? |
  | اردو | کیا یہ کسی کونسل، لائبریری یا سرکاری سروس جیسا لگتا ہے؟ |

  The translations are drafts and need a native reader before use. A "yes" in any locale fails the gate.
- **Landscape check** against FreeAgent, MoneyHelper, GOV.UK, HMRC and the main UK tax apps: side by side at icon
  size and in the lockup, the brand must not read as any of them.
- **Native-reader checks:**
  - the five-second translations above;
  - scripture or holy-book readings of the mark (Urdu, Hindi, Polish);
  - purple as premium, royal, or a Polish liturgical or mourning colour;
  - heather with primrose;
  - primrose against saffron.

The five-second test, the landscape check and the native-reader checks have not been done.

If the clearance or the five-second test fails, the fallback is a new motif. That is Yu's decision, not a further
tweak.

---

## 14. Open questions for Yu

1. **Copy and the brand line.** The social card and nav tagline use "Tax, understood. Then sorted." The root
   metadata title is "TaxSorted — A clearer way to sort your tax", the description begins "Practical UK tax tools
   for individuals, sole traders and landlords", and the footer line is "A clearer way to sort your tax." Should
   these move to the brand line? This change leaves page copy alone.
2. **`/vat` and `/dashboard`** during the follow-up: migrate first, or hide from navigation until migrated?
3. **The name in the lockup.** G1 says to always present the name as "TaxSorted.io", and this change follows it in
   metadata and the manifest (§2). The approved lockup and the nav's accessible name read "TaxSorted". Is the
   reader mark beside the word, with `taxsorted.io` on the social card, enough distance, or should the lockup or
   its placements carry ".io"?

---

## 15. Verification and limits

**First run (2026-10-20), on the finished change:**
- Every test suite passed: frontend vitest (123 files, 1272 tests), engine 393, api 1087 (plus 1 todo), desktop 79.
  Frontend `eslint` and `tsc --noEmit` passed.
- `next build` and `npm run check:release-pages` (35 pages) passed.
- `python3 docs/design/brand/render-brand.py --check` passed twice: "Sources check out and all 24 exports match
  their bytes." A VectorCraft 0.7.0 executable was refused by the version pin.
- `contrast.py --palette` on the contrast pairs file gives **85 PASS, 0 FAIL**. The file holds 85
  foreground/ground pairs: the shipped tokens, their opacity composites, and heather on the stock `amber-50` and
  `emerald-50` grounds. `derive.py --check` confirms the composites are current. The file's 13 token values equal
  `globals.css`.
- The built metadata was read on 81 pages. 80 had the social card; `/uk/personal-tax/` lacked `og:image`,
  `og:site_name` and `og:locale`, and `404.html` had `og:url` `https://taxsorted.io/_not-found/`. Both are fixed
  (§8).
- 116 before-and-after screenshots at 320, 390 and 1440 px: home, about, books, checkup, download, learn,
  services, trust, VAT, the footer, the open menu, Urdu right-to-left, Chromium's forced-colours emulation, and the
  keyboard focus halo on the home link, a primary button, the home ink panel and the menu button.
- Every shipped raster was looked at:
  - the favicon frames at zoom;
  - the Apple, PWA and maskable icons;
  - the social card at full size, at 400 px and as a square centre crop;
  - the Local icon on dark and light grounds.

The review that followed found the nav wrapping onto two rows in English from 1536 px and in Polish from 1280 px,
widths the first run had not covered. That is fixed (§6).

**Second run (2026-10-21), after the review fixes:**
- Every test suite passed: frontend vitest (123 files, 1273 tests), engine 393, api 1087 (plus 1 todo), desktop 79.
  Frontend `eslint` and `tsc --noEmit` passed.
- `next build` and `npm run check:release-pages` (35 pages) passed.
- `render-brand.py` was run in write mode, then `--check`: "Sources check out and all 23 exports match their
  bytes." The 8 opaque PNGs it rewrote decode to the same pixels as before; they gain the `sRGB` chunk that the
  removed flatten step used to strip. Every other export is byte for byte unchanged.
- The built metadata on all 81 pages is as §8 states.
- The nav was measured on the built site in all six locales: at 1280, 1366, 1440, 1536 and 1920 px in Chromium
  and WebKit, and at 320, 375, 640, 768 and 1024 px in Chromium (§6). A jump to a deep anchor on
  `/uk/personal-tax/` lands below the header in English and Polish at 1280, 1366, 1536 and 1920 px.
- Contrast of the colours this run added: heather on surface 5.97, white on heather 6.07, white on mulberry 12.79,
  ink on surface 15.64.

**Unknown:**
- the nav in browsers without `field-sizing`, such as Firefox (simulated only; §6);
- real browser favicon choice and dark-scheme favicon behaviour;
- a real Windows contrast theme;
- launcher masks, Dock rendering and macOS icon treatment;
- the highlighter stops for non-Latin scripts;
- every cultural reading in §13.
