"use client";

import { useId, useMemo, useState } from "react";
import { gbp } from "@/lib/format";
import { parsePounds } from "@/lib/parse";

function poundsOrNull(raw: string): number | null {
  const parsed = parsePounds(raw);
  return typeof parsed === "number" ? parsed : null;
}

export function TransactionWalkthrough() {
  const [sale, setSale] = useState("180.00");
  const [fee, setFee] = useState("18.00");
  const saleId = useId();
  const feeId = useId();
  const errorId = useId();

  const salePence = poundsOrNull(sale);
  const feePence = poundsOrNull(fee);
  const saleInvalid = salePence === null || salePence <= 0;
  const feeInvalid =
    feePence === null ||
    feePence < 0 ||
    (salePence !== null && feePence > salePence);
  const valid =
    !saleInvalid &&
    !feeInvalid &&
    salePence !== null &&
    feePence !== null;
  const payoutPence = valid ? salePence - feePence : 0;

  const machineRecord = useMemo(
    () =>
      JSON.stringify(
        {
          schema: "taxsorted.accounting-example/1",
          jurisdiction: "GB",
          tax_basis: "cash",
          facts: {
            gross_sale_pence: valid ? salePence : null,
            marketplace_fee_pence: valid ? feePence : null,
            bank_payout_pence: valid ? payoutPence : null,
          },
          checks: [
            "gross_sale_pence - marketplace_fee_pence = bank_payout_pence",
            "debits = credits",
          ],
          unknowns: [
            "whether the marketplace acted as agent or principal",
            "whether the fee was wholly for the business",
            "whether VAT applies",
          ],
          status: "teaching-example-not-saved-not-filed",
        },
        null,
        2,
      ),
    [feePence, payoutPence, salePence, valid],
  );

  return (
    <section
      id="example"
      aria-labelledby="example-title"
      tabIndex={-1}
      className="mt-16 scroll-mt-8"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
        One transaction, all the way down
      </p>
      <h2 id="example-title" className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Mina sells one card
      </h2>
      <p className="mt-3 max-w-3xl text-ink-soft">
        A made-up example. Change the numbers and open only the depth you want. Nothing here is
        saved, sent or mixed with your books.
      </p>

      <fieldset className="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-7">
        <legend className="px-2 text-lg font-semibold text-ink">What happened?</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={saleId} className="space-y-1.5 text-sm font-medium text-ink">
            Buyer paid
            <span className="relative block">
              <span aria-hidden="true" className="absolute inset-y-0 left-3 flex items-center text-ink-soft">
                £
              </span>
              <input
                id={saleId}
                value={sale}
                inputMode="decimal"
                aria-invalid={saleInvalid}
                aria-describedby={saleInvalid ? errorId : undefined}
                onChange={(event) => setSale(event.target.value)}
                className="min-h-11 w-full rounded-md border border-line bg-white py-2 pl-7 pr-3 text-base text-ink"
              />
            </span>
          </label>
          <label htmlFor={feeId} className="space-y-1.5 text-sm font-medium text-ink">
            Marketplace kept as its fee
            <span className="relative block">
              <span aria-hidden="true" className="absolute inset-y-0 left-3 flex items-center text-ink-soft">
                £
              </span>
              <input
                id={feeId}
                value={fee}
                inputMode="decimal"
                aria-invalid={feeInvalid}
                aria-describedby={feeInvalid ? errorId : undefined}
                onChange={(event) => setFee(event.target.value)}
                className="min-h-11 w-full rounded-md border border-line bg-white py-2 pl-7 pr-3 text-base text-ink"
              />
            </span>
          </label>
        </div>

        {!valid ? (
          <p
            id={errorId}
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            Enter a sale above £0 and a fee from £0 up to the sale amount.
          </p>
        ) : (
          <div aria-live="polite" className="mt-5 grid gap-3 sm:grid-cols-3">
            <Result label="Sale" value={gbp(salePence)} note="what the buyer paid" />
            <Result label="Fee" value={gbp(feePence)} note="a separate business cost, if allowable" />
            <Result label="Bank payout" value={gbp(payoutPence)} note="what Mina sees arrive" />
          </div>
        )}
      </fieldset>

      {valid ? (
        <div className="mt-5 space-y-3">
          <Depth title="The simple answer" status="Start here" open>
            <p>
              Mina made a {gbp(salePence)} sale. The marketplace charged {gbp(feePence)}. Her
              bank received {gbp(payoutPence)}.
            </p>
            <p className="mt-2 text-ink-soft">
              The bank line is cash, not the whole story. Treating the {gbp(payoutPence)} payout
              as the sale would hide both {gbp(feePence)} of income and {gbp(feePence)} of cost.
            </p>
          </Depth>

          <Depth title="Evidence" status="Why we believe it">
            <ul className="list-disc space-y-2 pl-5">
              <li>Marketplace sales report: buyer paid {gbp(salePence)}.</li>
              <li>Marketplace fee statement or invoice: fee {gbp(feePence)}.</li>
              <li>Bank statement: payout {gbp(payoutPence)}.</li>
            </ul>
            <p className="mt-3 text-ink-soft">
              The three amounts reconcile. The bank statement alone does not prove the gross sale
              or the fee.
            </p>
          </Depth>

          <Depth title="The full accounting entry" status="Double-entry view">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                <caption className="mb-3 text-left text-ink-soft">
                  Teaching view, assuming the marketplace collected the sale for Mina.
                </caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="py-2 pr-4 font-semibold">Account</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Debit</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Credit</th>
                    <th scope="col" className="py-2 font-semibold">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <JournalRow account="Marketplace receivable" debit={salePence} meaning="The marketplace owes the sale proceeds." />
                  <JournalRow account="Sales" credit={salePence} meaning="Record the gross sale." />
                  <JournalRow account="Marketplace fees" debit={feePence} meaning="Record the fee separately." />
                  <JournalRow account="Marketplace receivable" credit={feePence} meaning="The fee reduces what is owed." />
                  <JournalRow account="Bank" debit={payoutPence} meaning="Cash arrives." />
                  <JournalRow account="Marketplace receivable" credit={payoutPence} meaning="The marketplace settles the balance." />
                </tbody>
                <tfoot>
                  <tr className="border-t border-line font-semibold">
                    <td className="py-2 pr-4">Check</td>
                    <td className="py-2 pr-4">{gbp(salePence + feePence + payoutPence)}</td>
                    <td className="py-2 pr-4">{gbp(salePence + feePence + payoutPence)}</td>
                    <td className="py-2">Debits equal credits.</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Starter Books does not yet claim to be a complete double-entry general ledger. This
              view shows the deeper accounting model the product is growing towards.
            </p>
          </Depth>

          <Depth title="Profit and tax view" status="UK cash-basis example">
            <p>
              Before Mina&apos;s other costs, this transaction contributes{" "}
              <strong>{gbp(payoutPence)}</strong> to accounting profit: {gbp(salePence)} sale less{" "}
              {gbp(feePence)} fee.
            </p>
            <p className="mt-2 text-ink-soft">
              That is not Mina&apos;s tax bill. Tax depends on the full year, other income, which
              costs are allowable, reliefs and personal facts. The example assumes the marketplace
              was collecting for Mina and the fee was wholly for this business.
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              Official starting points:{" "}
              <a
                href="https://www.gov.uk/simpler-income-tax-cash-basis/income-and-expenses-under-cash-basis"
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-accent underline underline-offset-4"
              >
                cash-basis income and expenses
              </a>{" "}
              and{" "}
              <a
                href="https://www.gov.uk/self-employed-records/what-records-to-keep"
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-accent underline underline-offset-4"
              >
                records and proof to keep
              </a>
              .
            </p>
          </Depth>

          <Depth title="Machine-readable view" status="Inspect the data">
            <p className="mb-3 text-sm text-ink-soft">
              A portable teaching record, not an HMRC submission format and not a promise that the
              unknowns have been resolved.
            </p>
            <pre className="overflow-x-auto rounded-xl bg-ink p-4 text-sm leading-6 text-paper">
              <code>{machineRecord}</code>
            </pre>
          </Depth>
        </div>
      ) : null}
    </section>
  );
}

function Result({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{note}</p>
    </div>
  );
}

function Depth({
  title,
  status,
  open = false,
  children,
}: {
  title: string;
  status: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <summary className="min-h-11 cursor-pointer">
        <span className="font-semibold text-ink">{title}</span>
        <span className="ml-3 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-deep">
          {status}
        </span>
      </summary>
      <div className="mt-3 text-base text-ink">{children}</div>
    </details>
  );
}

function JournalRow({
  account,
  debit,
  credit,
  meaning,
}: {
  account: string;
  debit?: number;
  credit?: number;
  meaning: string;
}) {
  return (
    <tr className="border-b border-line/70">
      <th scope="row" className="py-2 pr-4 font-normal">{account}</th>
      <td className="py-2 pr-4">{debit === undefined ? "—" : gbp(debit)}</td>
      <td className="py-2 pr-4">{credit === undefined ? "—" : gbp(credit)}</td>
      <td className="py-2 text-ink-soft">{meaning}</td>
    </tr>
  );
}
