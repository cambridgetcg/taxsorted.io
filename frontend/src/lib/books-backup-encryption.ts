import { BOOKS_BACKUP_MAX_BYTES, BOOKS_BACKUP_SCHEMA, parseBooksBackup } from "@/lib/books-backup";
import { BACKUP_PASSWORD_MAX_BYTES, BACKUP_PASSWORD_MIN_LENGTH, createBackupEncryption } from "@/lib/backup-encryption";

export const BOOKS_ENCRYPTED_BACKUP_SCHEMA = "taxsorted.encrypted-books-backup/1" as const;
export const BOOKS_BACKUP_FILE_MAX_BYTES = 14 * 1024 * 1024;
export const BOOKS_BACKUP_PASSWORD_MIN_LENGTH = BACKUP_PASSWORD_MIN_LENGTH;
export const BOOKS_BACKUP_PASSWORD_MAX_BYTES = BACKUP_PASSWORD_MAX_BYTES;
export { validateBackupPassword } from "@/lib/backup-encryption";

const codec = createBackupEncryption({
  encryptedSchema: BOOKS_ENCRYPTED_BACKUP_SCHEMA,
  plainSchema: BOOKS_BACKUP_SCHEMA,
  plainMaxBytes: BOOKS_BACKUP_MAX_BYTES,
  fileMaxBytes: BOOKS_BACKUP_FILE_MAX_BYTES,
  allowPlain: true,
  label: "Books",
  unsupportedMessage: "This file is not a supported TaxSorted Books backup. Choose a Books backup exported by TaxSorted.",
  unchangedMessage: "Your Books have not changed.",
  invalidUnicodeMessage: "This Books backup contains invalid Unicode text. Export a fresh backup from Books.",
  validatePlaintext: parseBooksBackup,
});

/** Inspection grants no trust to legacy plain payloads; restore validates them. */
export const inspectBooksBackupFile = codec.inspectFile;
export const encryptBooksBackup = codec.encrypt;
export const decryptBooksBackup = codec.decrypt;
