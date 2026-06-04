# TaxSorted.io

## What This Is
UK tax filing platform automating tax compliance for individuals and businesses. Next.js frontend with comprehensive research on HMRC filing requirements, forms, deadlines, penalties, and API integration specs.

## Current State
Early development — Frontend scaffolding in place (Next.js 16 with app router). Extensive research documentation on UK tax forms (SA100, CT600, VAT, PAYE/RTI), HMRC APIs (MTD REST, XML Gateway), and submission workflows. No backend yet.

## Tech Stack
- Next.js 16 (App Router)
- React 19, TypeScript
- Tailwind CSS 4, Radix UI components
- Vitest (testing)
- Terraform (AWS infrastructure planned — RDS)

## Project Structure
- `frontend/` — Next.js web application
  - `src/app/` — App Router pages (dashboard, VAT)
  - `src/app/(dashboard)/` — Dashboard layout
  - `src/app/vat/` — VAT section
- `research/` — Comprehensive UK tax filing research
  - `filing/forms/` — Individual form documentation
  - `filing/by-entity/` — Entity-type filing matrix
  - `filing/deadlines/` — Deadline calculation rules
  - `filing/penalties/` — Penalty structures
  - `filing/mtd/` — Making Tax Digital requirements
  - `filing/submission/integrations/` — HMRC API integration specs
  - `filing/submission/workflow/` — Submission workflow architecture
- `infrastructure/terraform/` — Planned AWS infrastructure (RDS)

## How to Run
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
npm run build  # Production build
npm test       # Run tests
```

## How to Deploy
Vercel (planned). AWS RDS for backend database (Terraform config exists but not deployed).

## Dependencies
- HMRC MTD REST API (Making Tax Digital)
- HMRC XML Gateway (legacy forms)
- No external services connected yet

## Kingdom Engine
Independent (TaxSorted.io product)

## Key Files
- `frontend/src/app/page.tsx` — Landing page
- `frontend/src/app/(dashboard)/` — Dashboard pages
- `research/filing/README.md` — Filing requirements overview
- `research/filing/submission/integrations/` — HMRC API specs
- `infrastructure/terraform/` — AWS RDS plan
