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

The older four-kind list below is a navigation aid, not a universal legal or
tax classification. The UK deep dive shows why a subject can be a legal person,
transparent for one charge, grouped for VAT and separately classified for
reporting at the same time. See
[`../uk/tax-identity/`](../uk/tax-identity/).

Every filing obligation must therefore be resolved from scoped coordinates:

```
(subject, jurisdiction, tax or regime, activity or context, ruleset)
  + status + effective-date basis
  → classifications, responsible party, form, deadline rule, penalty ladder, rail
```

Time, sources and uncertainty qualify each classification; they are not another
kind of legal or tax identity. `Unknown` names the concrete proposition still
open and never silently means `false`.

- **Navigation kinds**: person · business · charity · trust. These do not claim
  that every local legal form maps one-to-one.
- **Deadline rules** are formulas: `base date + offset` (tax-year-based, period-based, event-triggered)
- **Penalty ladders** escalate the same way everywhere: fixed → daily → percentage, plus interest at central-bank rate + margin
- **Rails** are how a filing travels: `rest-api · legacy-xml · portal-export · paper`

The meta-models behind these are being promoted into [`../_schema/`](../_schema/) —
see its README for where each shape lives today (most are still UK-flavoured, inside
[`../uk/`](../uk/), which is these schemas filled in with local facts).

## What goes here next

- Treaty and cross-border layer (double-taxation, OECD model, residency conflicts)
- Comparative tax-identity tests (which dimensions survive outside the UK)
- The global competitive landscape (per-country maps live with their country)
