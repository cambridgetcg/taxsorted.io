# TaxSorted brand sources and exports

The brand guide is [BRAND.md](BRAND.md). This folder holds the editable source of every brand asset and the
script that exports them:

| File | What it is |
|---|---|
| `taxsorted-brand.vectorcraft` | The native VectorCraft master (format version 3, plain JSON) |
| `render-brand.py` | Checks the sources, then exports every asset to its place in the repository (Python 3, standard library only) |
| `exports/` | Lockups and marks for use outside the app: email, documents, press and inline SVG |
| `BRAND.md` | How to use the brand |

## Provenance

All the art is hand-authored vector geometry. No image generation was used anywhere.
- The mark was drawn as numbers (BRAND.md §5) and written as SVG path data by scripts used while designing it,
  then imported into VectorCraft. Those scripts are not in the repository; from here on the native master is
  the source.
- The wordmark is live Inter SemiBold text in the master, outlined at export. The social headline is live Georgia
  Bold text, outlined the same way.
- The master was built and is exported headless with the ArtCraft command-line tools:
  - [VectorCraft 0.13.1](https://github.com/storytold/vectorcraft/releases/tag/v0.13.1) (`vectorcraft-cli`) for
    the master, every SVG and every PNG;
  - [PhotoCraft 0.10.0](https://github.com/storytold/photocraft/releases/tag/v0.10.0) (`photocraft-cli`) to
    write the ICO frames.

  Both are independent ArtCraft-team tools, dual-licensed MIT OR Apache-2.0 (the `LICENSE-MIT` and
  `LICENSE-APACHE` files shipped with each release). The ArtCraft AI studio is a separate product and was not
  used.
- **Inter** is used under the SIL Open Font License 1.1 (copyright The Inter Project Authors). The exact file is
  the variable `Inter[opsz,wght].ttf`, version 4.001, from google/fonts commit
  `0b58fb370093f9a9f4ff785d94405710b79de67c` (SHA-256
  `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031`). It must be installed on the machine that
  exports, under any file name; the hash is what identifies it. It is not committed.
- **Georgia** (Bold) is Microsoft's font (© 2006 Microsoft Corporation, designed by Carter & Cone), shipped with
  macOS. It is used under the macOS font licence only to draw the social card headline, whose outlines appear
  only in the card PNG; the master embeds no font data. The exact file is `Georgia Bold.ttf`, version 5.00x-4, at
  `/System/Library/Fonts/Supplemental/` on macOS 15.7 (SHA-256
  `1cfa9abd55be746c798c22ef4eba88fce82257934897404be2dae53ed0a4142a`). It is not committed.

### Artboards, symbols and swatches

The master has eleven named artboards: Mark, Lockup, LockupSmall, Wordmark, Icon, Maskable, Local, Social,
Favicon16, Tile and LockupPlate. Two symbols supply the mark everywhere: "Common Reader" (32-unit grid) and
"Common Reader small" (16-unit grid). Six global swatches carry the colours: Brand ink, Brand heather,
Brand paper, Brand ink soft, Brand primrose and Brand dark accent. `render-brand.py` takes every colour from these
swatches. When a token in `frontend/src/app/globals.css` changes, change its swatch too and re-export (BRAND.md §3
lists both).

The Local artboard draws its glyph in place, as five named paths (`local-leaf-left` … `local-reader`), because it
needs paper pages with a dark-accent reader. Symbol edits therefore do not reach it; `render-brand.py` stops if
its shape no longer matches the symbol.

Compared with the design files Yu approved on 2026-10-20, this master changes three things, all from the last
design review:
the Social card is centred so a square crop keeps the headline and the "stay on your device" line; the Local tile
has a faint paper rim and a drop shadow; and the LockupPlate artboard adds an opaque plate with clear space for
email.

## What the script writes

`render-brand.py` writes 23 files. Paths are relative to the repository root.

| Output | From | Notes |
|---|---|---|
| `frontend/src/app/favicon.ico` | Favicon16 at 1×, 2×, 3×; Tile at 8× | Frames 16, 32, 48, 256 |
| `frontend/src/app/icon.svg` | Favicon16 | Plus a `prefers-color-scheme: dark` rule that lifts the tile to dark accent |
| `frontend/src/app/apple-icon.png` | Maskable, 180 × 180 | Opaque |
| `frontend/src/app/opengraph-image.png` | Social, 1200 × 630 | Opaque. Next copies it into `twitter:image` |
| `frontend/public/icons/icon-192.png`, `icon-512.png` | Icon | Rounded tile, transparent corners |
| `frontend/public/icons/maskable-192.png`, `maskable-512.png` | Maskable | Opaque, full bleed |
| `desktop/assets/icon.png`, `icon.svg` | Local, 1024 × 1024 | electron-builder uses the PNG for macOS, Windows and Linux |
| `docs/design/brand/exports/lockup.svg`, `lockup-small.svg` | Lockup, LockupSmall | Ink and heather |
| `docs/design/brand/exports/lockup-dark.svg`, `lockup-small-dark.svg` | Lockup, LockupSmall | Paper and dark accent |
| `docs/design/brand/exports/lockup-mono.svg`, `lockup-small-mono.svg` | the light lockups | `currentColor` + `var(--ts-mark-reader, currentColor)` |
| `docs/design/brand/exports/lockup.png`, `lockup@2x.png` | LockupPlate | Opaque paper plate |
| `docs/design/brand/exports/lockup-dark.png`, `lockup-dark@2x.png` | LockupPlate | Opaque ink plate |
| `docs/design/brand/exports/mark.svg`, `mark-small.svg` | `TaxSortedMark.tsx` | The component owns the mark's geometry |
| `frontend/src/components/brand/TaxSortedLockup.tsx` | the mono lockups | Only the path data inside its two `<svg>` elements is rewritten |

The opaque PNGs (apple, maskable, social, plates) are VectorCraft's own output: 0.13.1 writes them without an
alpha channel, and the script stops if one has one. The tab icons and the Local icon keep their transparent corners
and margins.

The alt text for the social card is in `frontend/src/app/opengraph-image.alt.txt`. Update it by hand if the card's
text changes.

## Edit and re-export

You need `vectorcraft-cli-0.13.1` and `photocraft-cli-0.10.0` on `PATH`, or set `VECTORCRAFT_CLI` and
`PHOTOCRAFT_CLI` to those executables. Inter and Georgia Bold (above) must be installed. In practice that means
macOS, or a machine with an equally licensed copy of the same Georgia Bold: the script stops on any font that is
not an exact match.

1. Edit the master.
   - **In the VectorCraft app:** open `docs/design/brand/taxsorted-brand.vectorcraft` and save it in place. The
     file is saved as format version 3 because the 0.7 app refuses version 4; a sample version-3 master opened
     cleanly in 0.7, but this one has not been tried there. Whether the Local shadow and inside rim survive a
     round trip through an older app is **unknown**, so re-run the check after saving.
   - **Headless:** `vectorcraft-cli-0.13.1 run --in docs/design/brand/taxsorted-brand.vectorcraft --cmd … --cmd
     document.save --params '{"path": "docs/design/brand/taxsorted-brand.vectorcraft", "version": 3}'`. Always pass
     a `path`: saving a converted file without one returns base64 instead of writing.
   - Keep the artboard, symbol, swatch and Local part names. The script stops if the artboard list changes.
2. To change the mark, change `frontend/src/components/brand/TaxSortedMark.tsx` and the master's two symbols
   together (`symbol.update` reaches every instance), then redraw the Local glyph to match.
3. From the repository root:

   ```sh
   python3 docs/design/brand/render-brand.py           # writes the 23 outputs
   python3 docs/design/brand/render-brand.py --check   # writes nothing; exit 1 if any output is stale
   ```
4. Look at what changed before committing, at 1× and zoomed. Then run the frontend tests
   (`npm test --workspace frontend`).

## What the checks cover

Before exporting, both modes stop with a message on:
- a `vectorcraft-cli` or `photocraft-cli` whose `--version` is not 0.13.1 or 0.10.0;
- a change to the artboard list;
- an import warning, or a font in the master that is not `exact` or has missing glyphs;
- a `TaxSortedMark.tsx` drawing whose reader paint is not on its one circle, or whose paths are not
  `currentColor` (the shape comparison below ignores colour);
- a difference between either drawing in `TaxSortedMark.tsx` and its native symbol, in shape, size or position.
  The component's SVG is imported into VectorCraft and turned into a symbol; points are compared to 1/10,000 of
  the drawing's width, and the instance each drawing makes on its own artboard pins size and position;
- a Local glyph that no longer has the symbol's shape.

While exporting, it also refuses live `<text>`, absolute machine paths and, in the inline SVGs and component,
`id` attributes. It refuses an opaque PNG export that has an alpha channel.

`--check` then compares every output byte for byte with the file in the repository and lists the stale ones. It
writes nothing outside a temporary folder.

The CI test `frontend/src/components/brand/__tests__/brand-geometry.test.tsx` needs no ArtCraft tools. It renders
`TaxSortedMark` and `TaxSortedLockup` and compares their geometry with `exports/mark.svg`, `mark-small.svg`,
`lockup-mono.svg` and `lockup-small-mono.svg`. It also checks that both components are decorative by default and
read `--ts-mark-reader` without ever setting it, and that the mark's reader paint is on its circle. So CI catches a
component edited without re-running the script, and the script catches a component that no longer matches the
master. **CI guards only those four component/export pairs.** Nothing in CI looks at the master or at the
rasters: a master edited without re-exporting, or a hand-swapped favicon or social card, passes CI. Only
`--check`, run by hand, catches those.

## Limits

- **Byte stability was shown on one machine**: an Apple-silicon Mac on macOS 15.7, with these CLI builds and the
  Inter and Georgia files above. On 2026-10-20, running the script and then `--check` twice reproduced all 24
  outputs of the time byte for byte. On 2026-10-21, after the separate X image and the flatten step were dropped,
  the script and then `--check` reproduced all 23. Other machines, other font
  files or other tool builds may change raster bytes, and font changes can change the outlined SVGs. The PNGs
  embed the master's fixed creation date, so re-saving the master does not churn them.
- `--check` does not run in CI, because the ArtCraft tools are not installed there.
- Nothing checks that the swatches equal the CSS tokens, and no contrast check runs from the repository. Both
  are by hand (BRAND.md §3 and §15).
- At 16 px the binding is a diagonal band, so its edges are antialiased rather than crisp.
- Browser favicon choice, the dark-scheme favicon query, real Windows contrast themes, launcher masks and the Dock
  were not tested; only Chromium's forced-colours emulation was run. The Local icon's rim and shadow were judged on
  flat dark and light grounds.
- electron-builder's own icon conversion for each platform was not run in this change.
- Opening and saving this master in the VectorCraft desktop app was not tested.
