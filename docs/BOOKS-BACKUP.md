# Local Books backup and restore

Every ordinary Books view exposes **Back up or restore your Books**. An account is
not required. The file stays on the person's device; signing in does not back up
Books. Downloads contain unencrypted financial records and should be kept in a
safe place outside the browser's site storage.

## Supported operation

Download a Books backup, then choose a backup to restore. The preview compares the
current and incoming business, record, review, history, source and provider counts.
Before replacement, download the Books currently present and explicitly confirm
that the safety copy was saved. Cancel leaves the current Books in place.

Restore replaces all Books in the current store. It does not merge two histories.
The current file format is `taxsorted.books-backup/1`, containing a `LocalBooksState`
v3 envelope and export timestamp. Existing CSV and older complete-history JSON
downloads remain useful exports; they are not accepted as this restore format.
Receipt attachments, sign-in credentials and HMRC-held data are outside the backup.

The restore retains money events, review decisions, event revisions, imports, raw
and normalised provider versions, and conflict evidence. Each restored business
requires scope confirmation again. Local account/entity and HMRC business links are
removed. Provider bindings, sync runs and completed checkpoints remain inspectable
in the original backup file but are not activated in the restored store. The new
store receives a fresh replica identity; providers must be reconnected and compared
again. Restoring does not establish current provider coverage or filing readiness.

The synthetic-provider demonstration uses a separate store. Ordinary Books backup
and restore do not read or replace it. Account sessions, Passport facts and other
browser-local features are separate and are not copied by this operation.

## Validation and atomicity

[The parser](../frontend/src/lib/books-backup.ts) checks the exact supported envelope,
dates, integer-pence amounts, categories, unique identities, history/source references
and provider payload/page digests. Unknown versions or fields are rejected. Files
are limited to 10 MiB, most collections to 20,000 items, businesses and connections
to 100, and arbitrary provider JSON to bounded depth/node counts. Export uses the
same validation, so this version does not offer a backup it cannot restore.
These checks establish structure and consistency, not the truth or authenticity of
the underlying financial records.

The preview captures a comparison fingerprint of the stored Books, legacy migration
baseline and migration-retirement marker. Replacement compares those keys and writes
the new Books, removes the old migration baseline and retires further legacy merging
in one [IndexedDB transaction](../frontend/src/lib/books-storage.ts). Any intervening
edit requires a new preview and safety copy. Failed or aborted writes keep the prior
keys. Digest verification and other asynchronous work finish before that transaction.

Browser restore requires the existing shared Web Lock so already-open v3 tabs cannot
write across the replacement. Without that browser capability, export remains
available and restore stops with an explanation. New code also rejects writes using
an obsolete replica identity. The legacy-retirement marker prevents a later v1 append
from silently resurrecting records that replacement deliberately removed.

## Verification boundary

Regression tests cover the file parser, store round trips, history and provider
isolation, preview invalidation, storage failure, transaction completion/abort and
the deliberate UI confirmation flow. Test backends and controlled IndexedDB doubles
are disposable; no real person's browser records were used. The
[batch verification record](RELEASE-HARDENING-2026-09-12.md) records final results and
the unavailable interactive browser walkthrough. Cross-browser recovery exercises
remain part of the operating evidence for a broader release.
