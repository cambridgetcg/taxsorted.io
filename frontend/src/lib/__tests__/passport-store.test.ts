import { describe, expect, it, vi } from "vitest";
import {
  createEmptyPassportDraft,
  createPassportStore,
  TAX_POSITION_PASSPORT_DRAFT_SCHEMA,
  type PassportStoreBackend,
} from "../passport-store";

function backendSpy() {
  const values = new Map<string, unknown>();
  const backend: PassportStoreBackend = {
    get: vi.fn((key: string) => values.get(key)),
    set: vi.fn((key: string, value: unknown) => values.set(key, value)),
    delete: vi.fn((key: string) => values.delete(key)),
  };
  return { backend, values };
}

describe("Tax Position Passport store", () => {
  it("does not create a Passport record when a visitor only opens it", async () => {
    const { backend } = backendSpy();
    const store = createPassportStore(backend);

    expect(await store.load()).toBeNull();
    expect(backend.set).not.toHaveBeenCalled();
  });

  it("saves only after an explicit write and advances a local revision", async () => {
    const { backend } = backendSpy();
    const times = [
      "2026-07-16T12:00:01.000Z",
      "2026-07-16T12:00:02.000Z",
    ];
    const store = createPassportStore(backend, () => times.shift()!);
    const draft = createEmptyPassportDraft("2026-07-16T12:00:00.000Z");
    draft.incomeSources.employment = "yes";
    draft.answeredIncomeSourceIds.push("employment");

    const first = await store.save(draft);
    const second = await store.save(first);

    expect(first).toMatchObject({
      schema: TAX_POSITION_PASSPORT_DRAFT_SCHEMA,
      revision: 1,
      createdAt: "2026-07-16T12:00:00.000Z",
      updatedAt: "2026-07-16T12:00:01.000Z",
    });
    expect(second).toMatchObject({
      revision: 2,
      createdAt: "2026-07-16T12:00:00.000Z",
      updatedAt: "2026-07-16T12:00:02.000Z",
    });
  });

  it("keeps unknown separate from an explicit no in the portable export", () => {
    const store = createPassportStore(
      new Map(),
      () => "2026-07-16T14:00:00.000Z",
    );
    const draft = createEmptyPassportDraft("2026-07-16T12:00:00.000Z");
    draft.incomeSources.employment = "yes";
    draft.incomeSources["self-employment"] = "unknown";
    draft.incomeSources["uk-property"] = "no";
    draft.answeredIncomeSourceIds.push(...[
      "employment",
      "self-employment",
      "uk-property",
      "foreign-property",
      "other-or-complex",
    ] as const);

    const passport = store.exportPassport(draft, {
      selfCheckedAt: null,
      storedInBrowser: false,
    });

    expect(passport.profile.incomeSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "self-employment", answer: "unknown" }),
        expect.objectContaining({ id: "uk-property", answer: "no" }),
      ]),
    );
    expect(passport.positions).toEqual([]);
    expect(passport.assurance.filed).toBe(false);
  });

  it("refuses to attribute untouched source defaults to the user", () => {
    const store = createPassportStore(new Map());
    const draft = createEmptyPassportDraft("2026-07-16T12:00:00.000Z");
    draft.incomeSources.employment = "yes";
    draft.answeredIncomeSourceIds.push("employment");

    expect(() =>
      store.exportPassport(draft, {
        selfCheckedAt: null,
        storedInBrowser: false,
      })
    ).toThrow(/answer every income-source question/i);
  });

  it("fails closed when the stored schema is damaged", async () => {
    const backend = new Map<string, unknown>();
    backend.set("taxsorted-tax-position-passport-draft-v1", {
      schema: TAX_POSITION_PASSPORT_DRAFT_SCHEMA,
      revision: 1,
    });
    const store = createPassportStore(backend);

    await expect(store.load()).rejects.toThrow(/unsupported or damaged/i);
  });

  it("fails closed when the stored MTD position field is missing", async () => {
    const backend = new Map<string, unknown>();
    const damaged = createEmptyPassportDraft(
      "2026-07-16T12:00:00.000Z",
    ) as Partial<ReturnType<typeof createEmptyPassportDraft>>;
    delete damaged.mtdIncomeTaxPosition;
    backend.set("taxsorted-tax-position-passport-draft-v1", damaged);

    await expect(createPassportStore(backend).load()).rejects.toThrow(
      /MTD position is invalid/i,
    );
  });

  it("rejects a stale save instead of overwriting newer facts", async () => {
    const backend = new Map<string, unknown>();
    const storeA = createPassportStore(
      backend,
      () => "2026-07-16T12:00:01.000Z",
    );
    const storeB = createPassportStore(
      backend,
      () => "2026-07-16T12:00:02.000Z",
    );
    const first = await storeA.save(
      createEmptyPassportDraft("2026-07-16T12:00:00.000Z"),
    );
    const stale = (await storeB.load())!;
    first.incomeSources.employment = "yes";
    first.answeredIncomeSourceIds.push("employment");
    await storeA.save(first);

    stale.incomeSources.employment = "no";
    stale.answeredIncomeSourceIds.push("employment");
    await expect(storeB.save(stale)).rejects.toThrow(/changed in another tab/i);
  });

  it("does not let a stale tab resurrect or delete a changed Passport", async () => {
    const backend = new Map<string, unknown>();
    const storeA = createPassportStore(
      backend,
      () => "2026-07-16T12:00:01.000Z",
    );
    const storeB = createPassportStore(
      backend,
      () => "2026-07-16T12:00:02.000Z",
    );
    const first = await storeA.save(
      createEmptyPassportDraft("2026-07-16T12:00:00.000Z"),
    );
    const stale = (await storeB.load())!;
    const second = await storeA.save(first);

    await expect(storeB.delete(stale.revision)).rejects.toThrow(
      /changed in another tab/i,
    );
    await storeA.delete(second.revision);
    await expect(storeB.save(stale)).rejects.toThrow(
      /changed in another tab|was deleted/i,
    );
  });

  it("deletes only the Passport key", async () => {
    const backend = new Map<string, unknown>();
    backend.set("taxsorted-local-books-v2", { untouched: true });
    const store = createPassportStore(
      backend,
      () => "2026-07-16T12:00:01.000Z",
    );
    const saved = await store.save(
      createEmptyPassportDraft("2026-07-16T12:00:00.000Z"),
    );

    await store.delete(saved.revision);

    expect(await store.load()).toBeNull();
    expect(backend.get("taxsorted-local-books-v2")).toEqual({ untouched: true });
  });
});
