import { LEARNING_ROUND_IDS } from "@/lib/learning-scenarios";

export const LEARNING_PROGRESS_KEY = "taxsorted.learn.progress.v1";
export const LEARNING_PROGRESS_EVENT = "taxsorted:learn-progress";
export const LEARNING_PROGRESS_SCHEMA = "taxsorted.learn-progress/1";

interface LearningProgressEnvelope {
  schema: typeof LEARNING_PROGRESS_SCHEMA;
  completedIds: string[];
}

export function parseLearningProgress(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const candidate = parsed as Partial<LearningProgressEnvelope>;
    if (
      candidate.schema !== LEARNING_PROGRESS_SCHEMA ||
      !Array.isArray(candidate.completedIds)
    ) {
      return [];
    }
    return LEARNING_ROUND_IDS.filter((id) => candidate.completedIds?.includes(id));
  } catch {
    return [];
  }
}

export function serializeLearningProgress(completedIds: readonly string[]): string {
  const envelope: LearningProgressEnvelope = {
    schema: LEARNING_PROGRESS_SCHEMA,
    completedIds: LEARNING_ROUND_IDS.filter((id) => completedIds.includes(id)),
  };
  return JSON.stringify(envelope);
}

export function readLearningProgressRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LEARNING_PROGRESS_KEY);
  } catch {
    return null;
  }
}

export function writeLearningProgress(completedIds: readonly string[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      LEARNING_PROGRESS_KEY,
      serializeLearningProgress(completedIds),
    );
    window.dispatchEvent(new Event(LEARNING_PROGRESS_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function removeLearningProgress(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(LEARNING_PROGRESS_KEY);
    window.dispatchEvent(new Event(LEARNING_PROGRESS_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function subscribeToLearningProgress(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === LEARNING_PROGRESS_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LEARNING_PROGRESS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LEARNING_PROGRESS_EVENT, onChange);
  };
}
