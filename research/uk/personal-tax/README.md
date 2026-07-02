# UK personal tax playbook — 玩爆英國個税, safely

This module explains how UK personal-tax optimisation works in plain language — especially the gap between work income and wealth/timing/wrapper choices.

It is spicy on purpose, but bounded:

- legal optimisation only;
- no evasion instructions;
- every play has GOV.UK/HMRC receipts;
- every play has an ordinary-person counter-move;
- every play states the legal line.

## Files

- `playbook.json` — the public playbook rendered by `/uk/personal-tax`.
- `source-ledger.json` — official source ledger: what each source supports and what it does not prove.

## Validate

```bash
npm run validate:uk-personal-tax
```

## Engine support

The teaching engine lives in:

```text
engine/jurisdictions/uk/personal-tax/
```

It currently models:

- personal allowance taper;
- approximate 60% Income Tax-only marginal band;
- simple employment Income Tax for England/Wales/NI;
- simplified CGT comparison;
- BADR 2026/27 teaching rate.

This is a teaching model, not a filing engine.
