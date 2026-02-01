# TaxSorted.io

UK Tax Filing Platform - Automating tax compliance for individuals and businesses.

## Project Structure

```
taxsorted.io/
├── frontend/           # Next.js web application
│   ├── src/
│   │   └── app/       # App Router pages
│   └── ...
│
└── research/          # Filing requirements documentation
    └── filing/        # Complete UK tax & regulatory filing guide
        ├── forms/             # Individual form documentation
        ├── by-entity/         # Entity-type filing matrix
        ├── deadlines/         # Deadline calculation rules
        ├── penalties/         # Penalty structures
        ├── mtd/               # Making Tax Digital requirements
        └── submission/        # API integration specs & workflow
            ├── integrations/  # HMRC API integration specs
            └── workflow/      # Submission workflow architecture
```

## Getting Started

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Deployment**: Vercel
- **APIs**: HMRC MTD (REST), HMRC XML Gateway

## Documentation

See `/research/filing/README.md` for comprehensive filing requirements documentation including:
- All UK tax forms (SA100, CT600, VAT, PAYE/RTI, etc.)
- Filing deadlines and calculation formulas
- Penalty structures
- API integration specifications
- Entity-centric submission workflow

## License

Proprietary - All rights reserved.
