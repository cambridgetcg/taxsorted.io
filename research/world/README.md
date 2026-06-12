# World — what is true everywhere

Knowledge that belongs to no single country. Everything in here must hold in every
jurisdiction we cover; if it only holds in one, it lives in that country's folder.

## The neutral ontology

Every tax we have met so far is one of three kinds:

| Kind | Taxes what | Examples |
|---|---|---|
| **Income** | Money coming in | income tax, corporation tax, payroll taxes |
| **Transaction** | Money changing hands | VAT / GST / sales tax, stamp duties, excise |
| **Wealth** | Money sitting still or passing on | property taxes, inheritance/estate taxes, net-wealth taxes |

And every filing obligation, anywhere, resolves from the same coordinates:

```
(jurisdiction, taxpayer kind, tax type) → form, deadline rule, penalty ladder, rail
```

- **Taxpayer kinds**: person · business · charity · trust (local legal forms map onto these)
- **Deadline rules** are formulas: `base date + offset` (tax-year-based, period-based, event-triggered)
- **Penalty ladders** escalate the same way everywhere: fixed → daily → percentage, plus interest at central-bank rate + margin
- **Rails** are how a filing travels: `rest-api · legacy-xml · portal-export · paper`

The meta-models behind these are being promoted into [`../_schema/`](../_schema/) —
see its README for where each shape lives today (most are still UK-flavoured, inside
[`../uk/`](../uk/), which is these schemas filled in with local facts).

## What goes here next

- Treaty and cross-border layer (double-taxation, OECD model, residency conflicts)
- Comparative taxpayer-kind taxonomy (how local legal forms map to the four kinds)
- The global competitive landscape (per-country maps live with their country)
