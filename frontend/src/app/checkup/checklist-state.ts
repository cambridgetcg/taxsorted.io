import { AUDIENCES, getAudience, type AudienceId, type ServiceId } from "@/lib/tax-services";

export const CHECKLIST_STORAGE_KEY = "taxsorted.tax-checklist-v1";
export const CHECKLIST_SCHEMA = "taxsorted.tax-checklist/1";
export type ChecklistProgress = Record<AudienceId, ServiceId[]>;

export interface SavedChecklist {
  schema: typeof CHECKLIST_SCHEMA;
  audience: AudienceId;
  checked: ChecklistProgress;
}

export function emptyChecklistProgress(): ChecklistProgress {
  return { individuals: [], "sole-traders": [], landlords: [], advisers: [], organisations: [] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Restore only this version's known task IDs, never arbitrary profile or tax data. */
export function parseSavedChecklist(raw: string): SavedChecklist | null {
  if (raw.length > 16_384) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || Object.keys(value).length !== 3 || value.schema !== CHECKLIST_SCHEMA) return null;
    if (typeof value.audience !== "string" || !getAudience(value.audience)) return null;
    if (!isObject(value.checked) || Object.keys(value.checked).length !== AUDIENCES.length) return null;
    const checked = emptyChecklistProgress();
    for (const audience of AUDIENCES) {
      const steps = value.checked[audience.id];
      if (!Array.isArray(steps) || steps.length > audience.serviceIds.length) return null;
      const allowed: readonly string[] = audience.serviceIds;
      if (steps.some((step) => typeof step !== "string" || !allowed.includes(step))) return null;
      if (new Set(steps).size !== steps.length) return null;
      checked[audience.id] = [...steps] as ServiceId[];
    }
    return { schema: CHECKLIST_SCHEMA, audience: value.audience as AudienceId, checked };
  } catch {
    return null;
  }
}
