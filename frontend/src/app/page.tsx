import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        File your UK VAT returns, simply.
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        TaxSorted turns your sales and purchases into a correct VAT return, tells you
        what you owe and when, and checks you&apos;re on the cheapest scheme. Plain
        English, no jargon.
      </p>

      <ul className="mt-8 space-y-3 text-gray-700">
        <li className="flex gap-3">
          <span aria-hidden="true">→</span>
          <span>See which returns are due, and exactly when.</span>
        </li>
        <li className="flex gap-3">
          <span aria-hidden="true">→</span>
          <span>Get the nine VAT boxes worked out from your figures, with the pennies right.</span>
        </li>
        <li className="flex gap-3">
          <span aria-hidden="true">→</span>
          <span>Find out if a different VAT scheme would save you money.</span>
        </li>
      </ul>

      <div className="mt-10">
        <Button asChild size="lg">
          <Link href="/dashboard">Open your dashboard</Link>
        </Button>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Honest by default: this version prepares your figures — filing straight to HMRC
        is being switched on.
      </p>
    </div>
  );
}
