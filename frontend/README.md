# TaxSorted frontend

Next.js 16 App Router, exported as static files. The browser talks to the Hono API
at `api.taxsorted.io`; there is no server runtime in this package.

Use Node 22 and install from the monorepo root so the shared engine workspace is
linked correctly:

```bash
node --version  # v22.x
npm ci
npm run dev --workspace frontend
```

The local app is at `http://localhost:3000` and defaults to the local API at
`http://localhost:8787`. Set `NEXT_PUBLIC_API_URL` only when deliberately pointing
the browser somewhere else.

Quality gates:

```bash
npm test --workspace frontend
npm run lint --workspace frontend
npm run typecheck --workspace frontend
npm run build --workspace frontend
```

Production is deployed by GitHub Actions to Cloudflare Pages only after the Fly API
deploy and live contract checks pass. Vercel remains available for previews and
manual fallback; automatic deployments from `main` are disabled in `vercel.json`.
