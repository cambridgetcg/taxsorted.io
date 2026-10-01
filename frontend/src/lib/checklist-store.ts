import { createWorkspaceSession, WORKSPACE_CHECKLIST_KEY, WORKSPACE_CHANGED_MESSAGE } from "@/lib/workspace-storage";
import { parseSavedChecklist } from "@/app/checkup/checklist-state";

export function createChecklistStore() {
  const session = createWorkspaceSession();
  return {
    async load(): Promise<string | null> {
      const raw = await session.read(WORKSPACE_CHECKLIST_KEY);
      if (raw == null) return null;
      if (typeof raw !== "string") throw new Error("The saved checklist could not be read. It has been left untouched.");
      return raw;
    },
    async save(raw: string, expected: string | null): Promise<void> {
      if (!parseSavedChecklist(raw)) throw new Error("The checklist could not be saved. Check its selected audience and steps.");
      await session.update(WORKSPACE_CHECKLIST_KEY, current => {
        if ((current ?? null) !== expected) throw new Error(WORKSPACE_CHANGED_MESSAGE);
        return raw;
      });
    },
    async clear(): Promise<void> {
      // Explicit null remains authoritative; an older localStorage copy is never re-imported.
      await session.update(WORKSPACE_CHECKLIST_KEY, () => null);
    },
  };
}
