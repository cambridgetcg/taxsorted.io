# TaxSorted as accounting software

## The promise

**Accounting software for people without an accounting department.**

TaxSorted helps an individual or small organisation keep records, understand what every
number means, see how it changes the accounts, and follow it into the relevant tax rule.
The first screen is simple. Every deeper layer remains open to inspection.

This is not a promise that every entity and filing route works today. The product is
UK-first. Current live books cover self-employment and UK property cash movements. Limited
company statutory accounts and Company Tax Returns are not live.

## Who it is for

- an individual trying to understand their own tax position
- a sole trader with no bookkeeper
- a landlord keeping property records
- a small business or organisation that cannot employ an in-house accounting team
- an accountant who wants cleaner evidence and fewer unexplained figures from a client
- a human working alone, with an agent, or with another person

## One stack

Every number should be traceable through the same six layers:

1. **Evidence** — the invoice, receipt, statement, contract or other proof.
2. **Event** — what happened, when, for how much, and for which activity.
3. **Books** — the journal and ledger treatment, including corrections.
4. **Accounts** — profit and loss, assets, debts and the balance sheet.
5. **Tax** — jurisdiction, period, taxpayer, adjustment, rule, date and source.
6. **File** — what a person approved, what was sent, and the authority receipt.

The interface may collapse layers. It must never erase them.

## Beginner-friendly means

- lead with money in, money out and “what was this for?”
- show one decision at a time
- use examples before asking for real records
- explain accounting words beside the real accounting model
- keep guesses waiting until a person confirms them
- show unknown facts as unknown, never as zero
- let a person export their records and the explanation

## The first task shell

Starter Books has four ordinary, linkable doors:

- **Today** says what needs attention and offers no more than three useful next actions.
- **Money** is where someone adds, imports, checks and exports money movements. Hand-added and
  imported items both wait in **To check** before they can count.
- **Business** keeps each sole trade or property business separate and shows only confirmed,
  recorded income and costs. It does not call these figures a bank balance or final profit.
- **Tax** shows cumulative Income Tax category totals for the current update period. It does not
  claim to show tax due, a full-year forecast or anything sent to HMRC.

The same underlying records feed every door. Waiting, excluded and unconfirmed items stay out of
totals. Separate businesses do not acquire a combined total merely because one browser stores them.

## Deep means

- money is stored as integer minor units
- source identity and revisions survive import
- corrections keep history instead of rewriting the past silently
- double-entry balances are checkable when the full ledger lands
- derived figures point back to their records
- tax rules are effective-dated and cite an official source
- preparation, approval, submission and receipt remain different states
- a machine-readable form exists beside each safely exposed human answer

## Learning is play

The learning portal uses a finite loop: predict, calculate, inspect the money effect, open
the source, explain the move back, then use it in Books. Every round stays open. There is no
timer, life counter or penalty for a useful wrong answer.

“Learning earnings” is a visible ledger, not a marketing total. Its lines keep their meanings:

- **cost kept visible** means the books no longer hide a cost
- **deduction found** means a worked example found an amount that can reduce taxable profit
- **estimated tax kept** means the difference between two like-for-like bounded estimates
- **realised saving** would require the learner's actual eligibility, evidence and result

Those values are not interchangeable and are never added together. A worked-example saving
is not accounting income, a refund or a promise about the learner's tax.

The allowance round has one deeper turn called **The Review Line**. It changes one observable
payer fact, derives allowance eligibility, and asks how far the evidence safely carries:

- `calculated` means the bounded profit-route comparison had the facts it requires;
- `needs_review` is an equally complete outcome with no invented profit route or tax figure;
- payer records showing employer income remove the unavailable allowance route before calculation;
- the ordinary-method figure is explicitly total relevant income less all deductions in the case,
  including any capital allowances; multiple trades, miscellaneous income and losses must be
  bounded rather than collapsed into an expenses-only shortcut;
- every reasoning receipt keeps what its source supports beside what the source does not prove.

The reward is non-monetary: keeping a material unknown visible, establishing eligibility before
comparison, or removing an unavailable route. The depth turn stores no case fact or prediction;
the existing stable round ID remains the only saved learning progress.

## Trust boundary

- No account is needed to try the public tools.
- Starter Books is local browser data. It is not encrypted cloud storage; clearing site data
  can erase it.
- Source trails are kept today; receipt and invoice attachments are not.
- No suggestion changes a figure until the user confirms it.
- TaxSorted is not yet recognised for production filing with HMRC.
- TaxSorted does not claim to replace professional advice when the facts exceed a tool's
  stated scope.

## Connections are boundaries

Accounting providers supply source records. TaxSorted owns review, explanation and tax mapping.
HMRC supplies obligations, authority responses and receipts. A connected provider is never proof
that the books are complete or reconciled, and an HMRC connection is never permission to file
silently.

The connector foundation remains local-first. The working made-up proof stores only account-owned
selection and sync-control metadata on the API server; each browser keeps its local-ledger binding,
raw provider versions, normalized records and reviewed books. The separate, default-closed Xero
authorisation pilot now has encrypted, versioned token custody and explicit organisation binding;
it has no financial dataset reader and does not import accounting records. Its private access and
cleanup boundaries are documented in the [runbook](../api/RUNBOOK.md#private-xero-authorisation-pilot).
A page becomes resumable only after its exact manifest is acknowledged under the current server
fencing token; complete coverage
advances only after the whole dataset run commits. Future webhooks mark every local replica as
needing refresh; they do not silently build a second cloud ledger. Shared cloud books would be a
later, explicit custody choice.

The proof is visible at `/books/connect/demo` in local development. It requires a full passkey
session, one explicit entity and activity choice, and an explicit acknowledgement that all provider
records are fictional. Those records live in a separate browser demo store and never enter ordinary
Starter Books. Its Stop button releases the exact fenced server run at a protocol boundary; a
partial run can never become the completed checkpoint. A later incremental run is allowed only when
the API and this browser hold exactly the same previous checkpoint. If the server completed but the
last browser write was interrupted, TaxSorted reconstructs that local checkpoint only after
re-hashing the fully acknowledged raw pages. A narrowly scoped clear button removes only the made-up
browser store and creates a fresh replica identity on the next run.

Accountant and practice channels wait for separate client workspaces, roles, authority records and
per-client storage/export isolation. Permission to read a client's provider records is not HMRC
filing authority.

The provider-neutral contract, industry evidence, HMRC module split and source-to-receipt flow are
kept in [ACCOUNTING-INTEGRATIONS.md](ACCOUNTING-INTEGRATIONS.md).

## Build order

1. Make Starter Books a first-class front door. **Implemented for the stated local UK scope.**
2. Add evidence attachments with clear local/export/storage rules.
3. Add bank reconciliation and separate ledgers for separate businesses.
4. Prove the provider-neutral connection, local-page acknowledgement and sync-run history with a
   made-up adapter and no credentials or network access. **Working in local development.**
5. Complete the privacy, deletion, incident and reconciliation gates a real provider needs.
   **Encrypted token custody and grant cleanup exist in the closed Xero authorisation pilot.**
6. Prove one read-only Xero financial adapter through the existing To check review boundary.
   **Authorisation and organisation binding alone do not complete this step.**
7. Add a real chart of accounts and balanced double-entry journal.
8. Derive profit and loss and balance sheet from that ledger.
9. Add year-end adjustments with an explicit review trail.
10. Add the UK limited-company accounts and separate Corporation Tax XML path.
11. Add production filing only after recognition, deliberate approval and tested receipts.

Each step must be useful alone and leave an off-switch. No step may claim the next one is
already complete.
