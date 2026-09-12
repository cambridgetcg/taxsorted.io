// Shared internal invariants. External backup input also passes strict shape validation.
import { assertPageManifest } from "@taxsorted/engine/accounting-sync";
import {
  exactOriginKey,
  providerRecordIdentityKey,
  validateAccountingEvent,
  type LocalBooksState,
} from "@/lib/local-books";

export function validateLocalBooksState(state: LocalBooksState): void {
  if (!Number.isSafeInteger(state.storeRevision) || state.storeRevision < 0) {
    throw new Error("invalid local books revision");
  }
  if (!state.replica.id || !state.replica.createdAt) {
    throw new Error("local books need one browser installation identity");
  }
  const ledgerIds = state.ledgers.map((ledger) => ledger.id);
  const eventIds = state.events.map((event) => event.id);
  if (new Set(ledgerIds).size !== ledgerIds.length) throw new Error("duplicate local ledger ID");
  if (new Set(eventIds).size !== eventIds.length) throw new Error("duplicate accounting event ID");
  for (const ledger of state.ledgers) {
    if (!ledger.id || !ledger.name || !["self-employment", "uk-property"].includes(ledger.activity)) {
      throw new Error("invalid local ledger");
    }
    if (!["needs-confirmation", "confirmed"].includes(ledger.scopeState)) {
      throw new Error("invalid local ledger scope state");
    }
    if (ledger.scopeState === "confirmed" && !ledger.scopeConfirmedAt) {
      throw new Error("confirmed local ledger needs a confirmation time");
    }
    if (ledger.ownerEntityId && (!ledger.ownerEntityName || !ledger.entityLinkedAt)) {
      throw new Error("linked local ledger needs an entity name and link time");
    }
    if (!ledger.ownerEntityId && (ledger.ownerEntityName || ledger.entityLinkedAt)) {
      throw new Error("incomplete local ledger entity link");
    }
    if (ledger.hmrcBusinessId && !ledger.ownerEntityId) {
      throw new Error("HMRC business link needs a TaxSorted entity link");
    }
  }
  state.events.forEach((event) => validateAccountingEvent(event, state.ledgers));

  const exactKeys = state.events
    .map((event) => exactOriginKey(event))
    .filter((key): key is string => key !== null);
  if (new Set(exactKeys).size !== exactKeys.length) {
    throw new Error("duplicate exact source identity");
  }

  const eventIdSet = new Set(eventIds);
  const historyKeys = new Set<string>();
  for (const revision of state.history) {
    const key = `${revision.eventId}:${revision.revision}`;
    if (historyKeys.has(key)) throw new Error("duplicate accounting event revision");
    historyKeys.add(key);
    if (!eventIdSet.has(revision.eventId) || revision.before.id !== revision.eventId) {
      throw new Error("accounting history refers to an unknown event");
    }
    if (revision.before.revision !== revision.revision) {
      throw new Error("accounting history revision does not match its snapshot");
    }
    validateAccountingEvent(revision.before, state.ledgers);
  }

  const importIds = state.imports.map((batch) => batch.id);
  if (new Set(importIds).size !== importIds.length) throw new Error("duplicate import batch ID");
  for (const batch of state.imports) {
    for (const eventId of [...batch.addedEventIds, ...batch.duplicateEventIds]) {
      if (!eventIdSet.has(eventId)) throw new Error("import batch refers to an unknown event");
    }
    for (const conflict of batch.conflicts) {
      if (!eventIdSet.has(conflict.existingEventId)) {
        throw new Error("import conflict refers to an unknown event");
      }
      if (!conflict.externalId || conflict.candidate.origin.externalId !== conflict.externalId) {
        throw new Error("import conflict source identity does not match its candidate");
      }
    }
  }

  const bindingIds = state.providerBindings.map((binding) => binding.sourceConnectionId);
  if (new Set(bindingIds).size !== bindingIds.length) {
    throw new Error("duplicate provider source connection binding");
  }
  const syncReplicaIds = new Set<string>();
  for (const binding of state.providerBindings) {
    if (
      !binding.sourceConnectionId ||
      !binding.entityId ||
      !binding.syncReplicaId ||
      !binding.organisationId ||
      !binding.organisationName ||
      !ledgerIds.includes(binding.ledgerId)
    ) {
      throw new Error("invalid provider ledger binding");
    }
    if (syncReplicaIds.has(binding.syncReplicaId)) {
      throw new Error("duplicate provider sync replica binding");
    }
    syncReplicaIds.add(binding.syncReplicaId);
    if (!Array.isArray(binding.capabilities)) throw new Error("invalid provider capabilities");
    const boundLedger = state.ledgers.find((ledger) => ledger.id === binding.ledgerId);
    if (boundLedger?.ownerEntityId !== binding.entityId) {
      throw new Error("provider source entity does not match its local ledger");
    }
  }

  const rawIds = state.rawProviderVersions.map((version) => version.id);
  if (new Set(rawIds).size !== rawIds.length) throw new Error("duplicate raw provider version ID");
  const rawIdentityVersions = new Set<string>();
  for (const version of state.rawProviderVersions) {
    if (!version.id || !version.payloadDigest || !version.observedAt) {
      throw new Error("invalid raw provider version");
    }
    const identityKey = providerRecordIdentityKey(version.identity);
    const versionKey = JSON.stringify([identityKey, version.payloadDigest]);
    if (rawIdentityVersions.has(versionKey)) {
      throw new Error("duplicate raw provider identity version");
    }
    rawIdentityVersions.add(versionKey);
  }

  const rawIdSet = new Set(rawIds);
  const normalizedIds = state.normalizedProviderVersions.map((version) => version.id);
  const normalizedById = new Map(state.normalizedProviderVersions.map((version) => [version.id, version]));
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new Error("duplicate normalized provider version ID");
  }
  for (const version of state.normalizedProviderVersions) {
    if (!version.id || !version.mapperVersion || !rawIdSet.has(version.rawVersionId)) {
      throw new Error("invalid normalized provider version");
    }
    if (!Array.isArray(version.limitations)) throw new Error("invalid normalized limitations");
  }

  const decimal = /^(0|[1-9]\d*)$/;
  const runIds = state.syncRuns.map((run) => run.id);
  if (new Set(runIds).size !== runIds.length) throw new Error("duplicate provider sync run ID");
  for (const run of state.syncRuns) {
    const binding = state.providerBindings.find(
      (candidate) => candidate.sourceConnectionId === run.sourceConnectionId
    );
    if (
      !binding ||
      binding.syncReplicaId !== run.syncReplicaId ||
      !decimal.test(run.fence) ||
      !Array.isArray(run.pages)
    ) {
      throw new Error("invalid provider sync run");
    }
    const manifests = run.pages.map((page) => page.manifest.id);
    const sequences = run.pages.map((page) => page.manifest.sequence);
    if (
      new Set(manifests).size !== manifests.length ||
      new Set(sequences).size !== sequences.length ||
      run.pages.some(
        (page, index) => {
          assertPageManifest(page.manifest);
          const prior = index > 0 ? run.pages[index - 1]!.manifest : null;
          const pageRawIds = new Set(page.rawVersionIds);
          const pageNormalized = page.normalizedVersionIds.map((id) =>
            normalizedById.get(id)
          );
          return (
            page.manifest.runId !== run.id ||
            page.manifest.sourceConnectionId !== run.sourceConnectionId ||
            page.manifest.replicaId !== run.syncReplicaId ||
            page.manifest.dataset !== run.dataset ||
            page.manifest.fence !== run.fence ||
            page.manifest.sequence !== index ||
            (prior !== null &&
              (prior.final ||
                page.manifest.currentCursor !== prior.nextCursor ||
                page.manifest.dirtyGeneration !== prior.dirtyGeneration)) ||
            page.rawVersionIds.length !== page.manifest.recordCount ||
            page.rawVersionIds.some((id) => !rawIdSet.has(id)) ||
            page.normalizedVersionIds.some((id) => !normalizedById.has(id)) ||
            pageRawIds.size !== page.rawVersionIds.length ||
            new Set(page.normalizedVersionIds).size !== page.normalizedVersionIds.length ||
            pageNormalized.some(
              (version) => !version || !pageRawIds.has(version.rawVersionId)
            )
          );
        }
      )
    ) {
      throw new Error("invalid provider sync page history");
    }
  }

  const checkpointKeys = new Set<string>();
  for (const checkpoint of state.datasetCheckpoints) {
    const key = JSON.stringify([
      checkpoint.sourceConnectionId,
      checkpoint.syncReplicaId,
      checkpoint.dataset,
    ]);
    if (
      checkpointKeys.has(key) ||
      !checkpoint.completedRunId ||
      !checkpoint.committedCursor ||
      !checkpoint.coverageMarker ||
      !decimal.test(checkpoint.dirtyGeneration) ||
      !Number.isSafeInteger(checkpoint.recordCount) ||
      checkpoint.recordCount < 0 ||
      !Number.isSafeInteger(checkpoint.pageCount) ||
      checkpoint.pageCount < 1
    ) {
      throw new Error("invalid provider dataset checkpoint");
    }
    checkpointKeys.add(key);
  }

  const conflictIds = state.conflictCases.map((conflict) => conflict.id);
  if (new Set(conflictIds).size !== conflictIds.length) {
    throw new Error("duplicate provider conflict case ID");
  }
  for (const conflict of state.conflictCases) {
    if (!conflict.id || !conflict.sourceKey || !conflict.openedAt) {
      throw new Error("invalid provider conflict case");
    }
    if (conflict.existingEventId && !eventIdSet.has(conflict.existingEventId)) {
      throw new Error("provider conflict refers to an unknown event");
    }
  }
}
