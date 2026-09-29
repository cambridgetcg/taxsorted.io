/**
 * Identifies the bundled desktop UI. This is a presentation and API-client
 * guard, not the security boundary: the desktop process enforces offline
 * operation independently of renderer code.
 */
export function isLocalApp(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.protocol === "taxsorted:" &&
    window.location.hostname === "app"
  );
}
