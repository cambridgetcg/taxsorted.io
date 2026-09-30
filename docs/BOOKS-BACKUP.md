# Local Books backup and restore

Open **Money records → Backups**, available from every ordinary Books view. The
desktop status bar and **File → Back up or restore workspace** now open
[complete workspace recovery](LOCAL-APP.md#where-personal-data-lives), which includes a link
back to this Books-only flow. An account is
not required. The default download is a password-protected file created on the
person's device. Signing in does not back up Books. Keep the file outside the app's
profile/site storage and keep its password separately. TaxSorted cannot reset the
password or recover a protected file without it.

## Save and recover a protected copy

1. Open **Backups → Save current Books**. Choose a long, unique password with at
   least 12 characters, repeat it and acknowledge that there is no password reset.
2. Download the backup, then check that the chosen file was actually saved. A
   started download does not prove a file exists; cancelling the native Save dialog
   must not be treated as a successful safety copy.
3. To recover, use **Restore a backup**, choose the file and enter its password to unlock a preview. Unlocking
   and checking a file do not replace any records. A wrong password or changed file
   stops before replacement.
4. Review the comparison, then use the safety-copy controls directly below it to
   download a protected copy of the Books currently
   here, and confirm that it was saved before choosing replacement. Check the result
   and keep the original backup until recovery is verified.

Leaving Backups clears its file selection, passwords and restore preview. Returning
with Back or Forward does not resume a replacement: choose the file again. The
underlying saved Books stay on the device. The Income Tax records route retains
its embedded **Back up or restore your Books** disclosure for existing users.

An explicitly selected **Unencrypted file** remains available for compatibility.
It requires a separate acknowledgement. Plain files contain readable financial
records. Choosing a file to restore resets the safety-copy download to protected;
the password for an incoming file is not silently reused for the safety copy.
Safety copies made during restore must be password-protected; the plain option is
available only for ordinary downloads outside a restore.
Older `taxsorted.books-backup/1` JSON files still open without a password.

## Supported operation

Download a Books backup, then choose a backup to restore. The preview compares the
current and incoming business, record, review, history, source and provider counts.
Before replacement, download the Books currently present and explicitly confirm
that the safety copy was saved. Cancel leaves the current Books in place.

Restore replaces all Books in the current store. It does not merge two histories.
The inner file format is `taxsorted.books-backup/1`, containing a `LocalBooksState`
v3 envelope and export timestamp. Protected files wrap it in
`taxsorted.encrypted-books-backup/1`. Existing CSV and older complete-history JSON
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

## What password protection covers

Encryption protects the exported Books file. It does not encrypt the live app
profile, browser storage, Passport exports, CSV files or attachments, and it does
not protect records while an attacker controls the running app or OS account.
The file's name, size and cryptographic format remain visible; financial data, record
counts and the export timestamp are inside the encrypted payload. A strong unique
password matters because someone holding a file can try guesses offline.

Passwords and derived keys are not written to browser storage, the app profile,
URLs or logs. The UI clears password fields after successful operations, file
changes and cancellation. This is not a guarantee of secure erasure from JavaScript
memory, OS swap, password managers or a compromised device.

The [codec](../frontend/src/lib/books-backup-encryption.ts) uses the platform's
Web Crypto implementation: AES-256-GCM with a 128-bit authentication tag, a fresh
random 12-byte IV and 16-byte salt per download, and PBKDF2-HMAC-SHA-256 with exactly
600,000 iterations. Keys are non-extractable. The fixed-order header, including
schema, algorithms, work factor, salt and IV, is authenticated with the ciphertext.
There is no crypto fallback or server-held recovery key. The selected work factor
matches [OWASP's PBKDF2-HMAC-SHA-256 guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2);
the primitives follow the [Web Crypto specification](https://www.w3.org/TR/webcrypto/)
and [AES-GCM parameter contract](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams).
These references do not constitute an independent audit of this implementation.

The protected envelope has exact `schema`, `kdf`, `cipher` and `ciphertext` fields.
Its algorithms and work factor are fixed for this version. Canonical base64,
decoded lengths, exact keys and file size are checked before key derivation;
untrusted files cannot choose an arbitrarily expensive KDF. The file limit is
14 MiB including encoding, while decrypted Books retain the 10 MiB limit.
Authenticated plaintext must be valid UTF-8 and pass the existing Books parser.
Passwords preserve spaces and Unicode without trimming or normalisation; this
version requires at least 12 Unicode code points, rejects unpaired surrogates and
caps UTF-8 input at 1,024 bytes. A future parameter change needs a new supported
format version with explicit compatibility handling.

## Validation and atomicity

[The parser](../frontend/src/lib/books-backup.ts) checks the exact supported envelope,
dates, integer-pence amounts, categories, unique identities, history/source references
and provider payload/page digests. Unknown versions or fields are rejected. Decoded
Books files are limited to 10 MiB, most collections to 20,000 items, businesses and connections
to 100, and arbitrary provider JSON to bounded depth/node counts. Export uses the
same validation, so this version does not offer a backup it cannot restore.
These checks establish structure and consistency, not the truth of the underlying
financial records. Authenticated encryption detects changes without the password;
it does not identify an accountant, provider or other author of those records.

The preview captures a comparison fingerprint of the stored Books, legacy migration
baseline and migration-retirement marker. Replacement compares those keys and writes
the new Books, removes the old migration baseline and retires further legacy merging
in one IndexedDB transaction. Before complete workspace adoption this uses the
[legacy Books keys](../frontend/src/lib/books-storage.ts); afterwards it updates those
slots inside the [canonical workspace](../frontend/src/lib/workspace-storage.ts),
preserving Passport, preparation and checklist slots. Any intervening
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
the deliberate UI confirmation flow. The protected-file suite uses real Web Crypto
and independent Node crypto interoperability, including maximum-size round trips,
wrong passwords, tampering, hostile work factors, encoding/Unicode boundaries and
missing crypto support. UI tests cover exact safety snapshots, blocked downloads,
legacy files and cancellation through the complete asynchronous crypto operation.
The desktop walkthrough exports protected files, independently decrypts them,
rejects a wrong password without changing current Books, then performs a confirmed
restore with a protected safety copy. Test backends and controlled IndexedDB doubles
are disposable; no real person's browser records were used. The
[September 12 verification record](RELEASE-HARDENING-2026-09-12.md) preserves the
historical parser/store results and that earlier campaign's unavailable walkthrough.
The [protected recovery campaign](testing/2026-09-29-protected-books.md) records the
initial encryption and UI evidence. The current
[navigation and recovery campaign](testing/2026-09-29-desktop-navigation.md) records
the direct Backups page, focus and native history checks, and explicitly observes
wrong-password rejection before checking that current records remain unchanged.
All 12 current native runtime reports pass that stronger assertion. Cross-browser recovery and
real native dialogs remain part of the manual acceptance plan for a broader release.
