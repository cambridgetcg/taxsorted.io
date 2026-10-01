import { BACKUP_PASSWORD_MAX_BYTES, BACKUP_PASSWORD_MIN_LENGTH, createBackupEncryption } from "@/lib/backup-encryption";
import { WORKSPACE_BACKUP_MAX_BYTES, WORKSPACE_BACKUP_SCHEMA, parseWorkspaceBackup } from "@/lib/workspace-backup";

export const WORKSPACE_ENCRYPTED_BACKUP_SCHEMA = "taxsorted.encrypted-workspace-backup/1" as const;
export const WORKSPACE_BACKUP_FILE_MAX_BYTES = 17 * 1024 * 1024;
export const WORKSPACE_BACKUP_PASSWORD_MIN_LENGTH = BACKUP_PASSWORD_MIN_LENGTH;
export const WORKSPACE_BACKUP_PASSWORD_MAX_BYTES = BACKUP_PASSWORD_MAX_BYTES;
export { validateBackupPassword as validateWorkspaceBackupPassword } from "@/lib/backup-encryption";

const codec = createBackupEncryption({
  encryptedSchema: WORKSPACE_ENCRYPTED_BACKUP_SCHEMA,
  plainSchema: WORKSPACE_BACKUP_SCHEMA,
  plainMaxBytes: WORKSPACE_BACKUP_MAX_BYTES,
  fileMaxBytes: WORKSPACE_BACKUP_FILE_MAX_BYTES,
  allowPlain: false,
  label: "workspace",
  unsupportedMessage: "Choose an encrypted TaxSorted workspace backup. Books-only files and unencrypted files are not supported here.",
  unchangedMessage: "Your saved workspace has not changed.",
  invalidUnicodeMessage: "This workspace backup contains invalid Unicode text. Export a fresh workspace backup.",
  validatePlaintext: parseWorkspaceBackup,
});

/** Validate envelope/size before asking for a password; no decryption or KDF. */
export function inspectWorkspaceBackupFile(json: string): "encrypted" {
  codec.inspectFile(json);
  return "encrypted";
}
export const encryptWorkspaceBackup = codec.encrypt;
export const decryptWorkspaceBackup = codec.decrypt;
