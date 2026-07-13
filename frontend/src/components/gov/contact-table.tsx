// i18n: deferred to M2 — plain English for launch

import type { ContactChannel } from "@/lib/gov/contacts";

export interface ContactTableProps {
  channels: ContactChannel[];
}

/**
 * Renders `HMRC_CHANNELS` (or any `ContactChannel[]`) as a plain table —
 * who it's for, the channel, the exact detail, and hours if published.
 * Presentational only (no client state) so it's safe to reuse anywhere,
 * including the dashboard's civic voice panel.
 */
export function ContactTable({ channels }: ContactTableProps) {
  return (
    <div>
      <p className="mb-2 text-sm text-ink-soft sm:hidden" aria-hidden="true">
        Wide table — swipe sideways to see it all →
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full text-left text-base">
        <thead className="bg-paper text-ink-soft">
          <tr>
            <th scope="col" className="p-3 font-medium">
              Who it&apos;s for
            </th>
            <th scope="col" className="p-3 font-medium">
              Channel
            </th>
            <th scope="col" className="p-3 font-medium">
              Details
            </th>
            <th scope="col" className="p-3 font-medium">
              Hours
            </th>
          </tr>
        </thead>
        <tbody>
          {channels.map((c) => (
            <tr key={c.id} className="border-t border-line align-top">
              <td className="p-3">{c.audience}</td>
              <td className="p-3">{c.channel}</td>
              <td className="p-3">{c.details}</td>
              <td className="p-3">{c.hours ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
