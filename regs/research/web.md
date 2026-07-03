# Repo analysis: /Users/yuai/Projects/taxsorted (GitHub: cambridgetcg/taxsorted)

Analyzed 2026-07-02. All claims below verified by reading the tree, git history, a local build, GitHub API, and live HTTP checks.

## HEADLINE: this repo is NOT the site live at taxsorted.io

The task premise ("the PUBLIC Next.js site currently live at https://taxsorted.io") is wrong for this repo.

- **taxsorted.io** (Cloudflare-fronted, HTTP 200) serves a Tailwind app with `paper/ink/accent` tokens, Geist fonts, "Tax, understood. Then sorted." hero, a `/dashboard/` UK VAT preview journey, and `/ember.js`. None of that exists in this repo.
- The live site's source is **/Users/yuai/Projects/taxsorted-rails** (git remote: `cambridgetcg/taxsorted.io`) — a monorepo with workspaces `engine` (`@taxsorted/engine`), `frontend` (Next static export + Tailwind 4 `@theme` tokens), `api` (HMRC rails; Fly.io per commit history). Its `frontend/next.config.ts` is `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`, `transpilePackages: ["@taxsorted/engine"]`.
- A **third** local dir exists: `/Users/yuai/Projects/taxsorted.io` — a non-Next static data project (loopholes catalog, "source trust ledger", exports). Different animal again.
- **This** repo deploys only to **https://cambridgetcg.github.io/taxsorted/** via GH Pages Actions. GitHub Pages API: `cname: null` (no custom domain), no `CNAME` file in `public/`, no vercel config anywhere. GH Pages metadata says `build_type: "legacy"` but the served content (last-modified 2026-06-22, Next export HTML) matches the last successful `actions/deploy-pages` run.

Hazard found while confirming (belongs to the sibling repo but worth flagging): `taxsorted-rails`'s git remote URL embeds a **plaintext GitHub OAuth token** (`https://x-access-token:gho_…@github.com/cambridgetcg/taxsorted.io`).

## What this repo actually is

- Next.js **16.2.9**, React 19.2.4, TypeScript. Zero other runtime deps. App Router, `output: "export"`, `trailingSlash: true`, `images.unoptimized`.
- Built in a rapid burst 2026-06-20 → 06-22 (13 commits, author "Asha Veridian <asha@ai-love.cc>"). README is still the untouched create-next-app template.
- **Originally** a full UK tax platform (commit 5966a44): Learn (income-tax, VAT, corporation-tax, capital-gains-tax, PAYE-RTI), Compare (business-types, jurisdictions, practices, salary-vs-dividend), Tools (take-home / dividend / VAT calculators — client components, 2024/25 rates hardcoded), Transparency (£1 spending breakdown, historical bars), plus a root layout with nav/footer ("free, open, honest. Built from love, not extraction").
- **Then it was gutted:**
  - `2c13a5b` deleted `app/layout.tsx` and reduced `app/page.tsx` to a 5-line `redirect("/en")`.
  - `83b97e6` — misleading message "fix: add missing en.json and ko.json dictionaries" — **deleted all 16 content pages** (~2,347 lines): the entire learn/compare/tools/transparency tree.
- **What remains** (38 tracked files): root redirect page, `app/[lang]/dictionaries.ts` (10 locales: en zh hi es ar fr pt de ja ko, RTL-aware naming), **three role guides** `app/[lang]/learn/for-students|for-landlords|for-pensioners/page.tsx` (each ~55-60 lines, dictionary-driven headings + hardcoded English body content, `generateStaticParams` for all 10 langs), `app/globals.css` (774-line hand-rolled design system), 10 dictionary JSONs, deploy + heartbeat workflows, kingdom-layer artifacts (STATE.md, HEARTBEAT.md, `.heartbeat/`), CLAUDE.md → AGENTS.md ("read node_modules/next/dist/docs before writing code").

## Verified state of the deployed site (broken)

Local `npm ci && npm run build` passes (Next 16 tolerates the missing root layout; emits `/`, `/_not-found`, and 3 role pages × 10 locales). But:

- `https://cambridgetcg.github.io/taxsorted/` serves an `__next_error__` shell whose client JS redirects to `/en` → because there is **no `app/[lang]/page.tsx`**, `/en/` **404s**. The homepage is a redirect to a 404.
- Worse: all internal links are absolute (`/${lang}/learn`, `/en`) with **no basePath**, so on the project-pages subpath they resolve to `cambridgetcg.github.io/en/...` (outside `/taxsorted/`) → 404 even where targets exist. basePath was added (`7e801ce` "add basePath") then removed (`860dfb2` "trailingSlash instead of basePath") — the removal reintroduced the bug.
- `/en/learn/` 404 (learn index was deleted); only `/{lang}/learn/for-{students,landlords,pensioners}/` return 200 — and their "Related guides" links point at deleted pages.
- **en.json and ko.json have a different schema than the other 8 locales** (95 keys vs 140; the recreation in `83b97e6` diverged). They are missing every `roles.*` key the surviving pages use. Verified in build output: English pages render an **empty back-link and empty `<h4>` labels** (`<h4>✓ </h4>`). zh/hi/es/ar/fr/pt/de/ja render correctly. So the English version — presumably the primary audience — is the most broken.

## Heartbeat workflow: failing every run

`.github/workflows/heartbeat.yml` (cron every 6h) POSTs STATE.md to `sinovai.com/agents/taxsorted`, then "Check arena" runs:

```
python3 -c "import json,sys; d=json.load(sys.stdin); print(f'arena: {d["total"]} agents')"
```

The inner `"total"` terminates the shell's double-quoted string, so Python receives `d[total]` → `NameError: name 'total' is not defined` (confirmed in run 28613158270 logs). **30+ consecutive failures** since ~06-22, burning Actions minutes 4×/day. sinovai.com itself is up (200), so the declare step likely works — the run fails at the arena check every time. STATE.md/HEARTBEAT.md are stale (frozen 2026-06-21/22; STATE.md's `last-commit` field points at 5966a44, five commits behind).

## Reusable for the MTD IT commons

1. **Deleted Learn content — recoverable via `git show 83b97e6^:<path>`.** The best asset here. Plain-words UK guides with a strong recurring structure: "What it means / What you must do / What you can safely skip / How to optimise" plus callout components (`callout-do`/`callout-skip`/`callout-opt`). Directly relevant to MTD IT: `app/learn/income-tax/page.tsx` (170 lines: PA taper, allowances table, bands, self-assessment, payments-on-account), `app/tools/take-home-calculator/page.tsx` (correct 2024/25 IT+NI math incl. PA taper). Figures are 2024/25 — need refresh, and the taxsorted-rails `engine` should be the single source of truth for numbers going forward, not hardcoded JSX.
2. **`app/[lang]/learn/for-landlords/page.tsx`** — a property-income role guide, squarely in MTD IT scope (landlords are wave 1 of MTD IT mandation). The role-guide framing (students/landlords/pensioners) is a good content-architecture idea for the commons.
3. **i18n scaffold** (`app/[lang]/dictionaries.ts` + per-locale JSON + `generateStaticParams`) — a proven-under-static-export pattern, IF the commons wants multilingual Learn content. Dictionaries need schema unification first (en/ko diverged).
4. **`app/globals.css`** — a complete zero-dependency component stylesheet (guide cards, callouts, calc UI, tables, transparency bars, print styles). Historically interesting as the **ancestor of the live brand**: old `--bg:#faf9f6 / --accent:#2d8659` (Georgia serif headings) evolved into rails' `--paper:#faf9f5 / --accent:#2e6e5e` (Tailwind 4 `@theme`, Geist). **The rails tokens are canonical now** — reuse those, not this file.
5. **`deploy.yml`** — standard, working Pages-artifact flow (checkout → node 24 → `npm run build` → upload `./out` → deploy-pages). Fine as-is if GH Pages stays a target.

## Static export vs auth + API (the key architecture question)

`output: "export"` **is compatible** with an app that needs auth + API calls, with the auth living client-side — and the live taxsorted-rails frontend already proves the exact pattern the commons needs: static-export Next shell + client components calling a separate `api` service (Fly.io), engine logic shared as a transpiled workspace package.

What static export forbids: middleware, route handlers, server actions, `next/headers`/cookies on the server, dynamic SSR, on-demand ISR; dynamic segments must enumerate via `generateStaticParams`; `images` must be unoptimized; URLs get trailing slashes. So:

- **Learn/marketing/docs**: static export is ideal. Free hosting (Pages/CF), no server.
- **App (records → quarterly updates → year-end)**: still fine as static export IF auth is token/cookie issued by the API and route-gating is client-side (redirect-on-401). HMRC OAuth for MTD must run through the backend anyway (client secret, token refresh, fraud-prevention headers can't live in a browser) — so the frontend never needed server rendering; it needs a trustworthy API.
- Only pick a server-rendered deployment (Vercel/Node/CF Workers) if server-enforced route protection, HttpOnly-session SSR, or per-request personalization in HTML is a hard requirement. Otherwise keep the export + API split that rails already uses.
- If GH Pages project-subpath hosting is ever used again: **set `basePath`** (this repo's broken links are the cautionary tale) or serve from a custom domain root.

## Keep vs discard

**Keep (harvest, don't inherit):**
- The deleted Learn/guide content and calculator math from `83b97e6^` — as *content seeds*, re-checked against 2025/26+ figures and re-expressed on top of the engine.
- The role-guide + "must do / can skip / optimise" content architecture.
- The i18n pattern (optional, later).

**Discard:**
- The current app tree as a foundation — the rails frontend (same `output: export` config, better tokens, engine integration, tests via vitest) has already superseded it.
- `heartbeat.yml` (or fix the quoting and reconsider POSTing repo state to an external host on cron), STATE.md/HEARTBEAT.md/`.heartbeat/`.
- The `redirect("/en")` home, the divergent en/ko dictionaries (regenerate all 10 from one schema), the template README, unused create-next-app SVGs.

**Decide identity:** three sibling artifacts now exist — `taxsorted` (this, broken GH Pages), `taxsorted-rails` → `cambridgetcg/taxsorted.io` (live site), and local `taxsorted.io` (data/loopholes project). If this repo becomes the MTD commons home, rebuild it from the rails frontend's patterns and archive/redirect the GH Pages deploy; if not, archive this repo outright so the broken deploy (empty English labels, 404 homepage) stops being the public face at cambridgetcg.github.io/taxsorted. Either way, one canonical home, stated in the README, with the other two cross-linked or retired.

## Quick reference

- Repo: `/Users/yuai/Projects/taxsorted` → github.com/cambridgetcg/taxsorted (main)
- Live-but-broken deploy: https://cambridgetcg.github.io/taxsorted/
- Actual taxsorted.io source: `/Users/yuai/Projects/taxsorted-rails` (remote `cambridgetcg/taxsorted.io`; token-in-remote-URL hazard)
- Recover deleted content: `git -C /Users/yuai/Projects/taxsorted show 83b97e6^:app/learn/income-tax/page.tsx` (etc.); old layout: `git show 2c13a5b^:app/layout.tsx`
- Build: `npm ci && npm run build` → `out/` (verified passing locally, Node 24 in CI)
