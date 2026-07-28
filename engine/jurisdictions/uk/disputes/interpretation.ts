import {
  TAX_DISPUTE_FRAMEWORK,
  type BuildUkTaxDisputeInterpretationInput,
  type TaxDisputeCaseRecord,
  type TaxDisputeDimension,
  type TaxDisputeMajorChallenge,
  type TaxDisputeReasonStep,
  type UkTaxDisputeInterpretation,
} from "./contract";

const HAWORTH_CASE_ID = "haworth-v-hmrc-2021";

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareAscii);
}

function findingAt(
  caseRecord: TaxDisputeCaseRecord,
  id: string,
) {
  const index = caseRecord.findings.findIndex((finding) => finding.id === id);
  if (index < 0) {
    throw new Error(
      `Tax-dispute adapter ${HAWORTH_CASE_ID} requires finding ${id}`,
    );
  }
  return {
    value: caseRecord.findings[index]!,
    pointer: `/findings/${index}`,
  };
}

function counterweightAt(
  caseRecord: TaxDisputeCaseRecord,
  id: string,
) {
  const index = caseRecord.counterweights.findIndex(
    (counterweight) => counterweight.id === id,
  );
  if (index < 0) {
    throw new Error(
      `Tax-dispute adapter ${HAWORTH_CASE_ID} requires counterweight ${id}`,
    );
  }
  return {
    value: caseRecord.counterweights[index]!,
    pointer: `/counterweights/${index}`,
  };
}

function remedyAt(
  caseRecord: TaxDisputeCaseRecord,
  id: string,
) {
  const index = caseRecord.remedies.findIndex((remedy) => remedy.id === id);
  if (index < 0) {
    throw new Error(
      `Tax-dispute adapter ${HAWORTH_CASE_ID} requires remedy ${id}`,
    );
  }
  return {
    value: caseRecord.remedies[index]!,
    pointer: `/remedies/${index}`,
  };
}

function timelineAt(
  caseRecord: TaxDisputeCaseRecord,
  predicate: (event: TaxDisputeCaseRecord["timeline"][number]) => boolean,
  label: string,
) {
  const index = caseRecord.timeline.findIndex(predicate);
  if (index < 0) {
    throw new Error(
      `Tax-dispute adapter ${HAWORTH_CASE_ID} requires timeline event ${label}`,
    );
  }
  return {
    value: caseRecord.timeline[index]!,
    pointer: `/timeline/${index}`,
  };
}

function dimension(
  id: TaxDisputeDimension["id"],
  values: Omit<TaxDisputeDimension, "id" | "order" | "title" | "question">,
): TaxDisputeDimension {
  const definition = TAX_DISPUTE_FRAMEWORK.dimensions.find(
    (candidate) => candidate.id === id,
  );
  if (!definition) throw new Error(`Unknown tax-dispute dimension ${id}`);
  return {
    ...definition,
    ...values,
  };
}

function buildHaworthInterpretation(
  input: BuildUkTaxDisputeInterpretationInput,
): UkTaxDisputeInterpretation {
  const { caseRecord } = input;
  const threshold = findingAt(caseRecord, "threshold-not-met");
  const precedent = findingAt(caseRecord, "earlier-ruling-overstated");
  const access = findingAt(caseRecord, "access-to-justice");
  const taxBoundary = counterweightAt(
    caseRecord,
    "tax-liability-not-decided",
  );
  const meritsLoss = counterweightAt(caseRecord, "substantive-appeal-lost");
  const noPenalty = counterweightAt(caseRecord, "no-penalty-imposed");
  const followerNotice = remedyAt(caseRecord, "quash-follower-notice");
  const acceleratedNotice = remedyAt(
    caseRecord,
    "quash-accelerated-payment-notice",
  );
  const supremeCourtOutcome = timelineAt(
    caseRecord,
    (event) =>
      event.date === "2021-07-02" &&
      event.event.includes("Supreme Court"),
    "Supreme Court outcome",
  );
  const laterMeritsEvents = caseRecord.timeline
    .map((event, index) => ({ event, pointer: `/timeline/${index}` }))
    .filter(({ event }) => event.state === "later-procedural-outcome");
  if (laterMeritsEvents.length === 0) {
    throw new Error(
      `Tax-dispute adapter ${HAWORTH_CASE_ID} requires later merits history`,
    );
  }

  const reasonSteps: TaxDisputeReasonStep[] = [
    {
      id: "reason:threshold-not-met",
      decisiveness: "decisive",
      issueBranch: "issue-1-statutory-threshold",
      proposition: threshold.value.statement,
      casePointers: [threshold.pointer],
      sourceIds: uniqueSorted(threshold.value.sourceIds),
      sourcePinpoints: [
        {
          sourceId: "uksc-haworth-2021-press-summary",
          locator:
            "Press summary: Issue 1; judgment [46], [57]–[69]",
        },
        {
          sourceId: "uksc-haworth-2021-judgment",
          locator: "Judgment paragraphs [46], [57]–[69]",
        },
      ],
      gaps: [],
    },
    {
      id: "reason:earlier-ruling-overstated",
      decisiveness: "decisive",
      issueBranch: "issue-2-smallwood-and-relief",
      proposition: precedent.value.statement,
      casePointers: [precedent.pointer],
      sourceIds: uniqueSorted(precedent.value.sourceIds),
      sourcePinpoints: [
        {
          sourceId: "uksc-haworth-2021-press-summary",
          locator:
            "Press summary: Issue 2; judgment [31], [74]–[76]",
        },
        {
          sourceId: "uksc-haworth-2021-judgment",
          locator: "Judgment paragraphs [74]–[76]",
        },
      ],
      gaps: [
        "The canonical case record does not separately map the court's Senior Courts Act 1981 section 31(2A) materiality and relief step. This proposition must not be read as saying every legal misdirection requires quashing.",
      ],
    },
    {
      id: "reason:access-to-justice",
      decisiveness: "supporting",
      issueBranch: "issue-1-statutory-context",
      proposition: access.value.statement,
      casePointers: [access.pointer],
      sourceIds: uniqueSorted(access.value.sourceIds),
      sourcePinpoints: [
        {
          sourceId: "uksc-haworth-2021-press-summary",
          locator:
            "Press summary: statutory construction and access to justice; judgment [57]–[63]",
        },
        {
          sourceId: "uksc-haworth-2021-judgment",
          locator: "Judgment paragraphs [57]–[63]",
        },
      ],
      gaps: [],
    },
    {
      id: "boundary:underlying-tax-not-decided",
      decisiveness: "boundary",
      issueBranch: "cross-proceeding-boundary",
      proposition: taxBoundary.value.statement,
      casePointers: [taxBoundary.pointer],
      sourceIds: uniqueSorted(taxBoundary.value.sourceIds),
      sourcePinpoints: [],
      gaps: [
        "The packet does not give a single pinpoint for this cross-proceeding boundary.",
      ],
    },
    {
      id: "boundary:later-merits-loss",
      decisiveness: "boundary",
      issueBranch: "later-merits-history",
      proposition: meritsLoss.value.statement,
      casePointers: [
        meritsLoss.pointer,
        ...laterMeritsEvents.map(({ pointer }) => pointer),
      ],
      sourceIds: uniqueSorted([
        ...meritsLoss.value.sourceIds,
        ...laterMeritsEvents.flatMap(({ event }) => event.sourceIds),
      ]),
      sourcePinpoints: [],
      gaps: [
        "The packet maps the later disposition but not every argument or finding in the separate merits appeal.",
      ],
    },
  ];

  const dimensions: TaxDisputeDimension[] = [
    dimension("case-identity-and-tax-context", {
      state: "mapped",
      reading:
        `${caseRecord.title} ${caseRecord.citation} concerns ${caseRecord.subject} in ${caseRecord.territory}.`,
      casePointers: [
        "/id",
        "/title",
        "/citation",
        "/territory",
        "/subject",
        "/publicBody",
      ],
      sourceIds: uniqueSorted([
        ...supremeCourtOutcome.value.sourceIds,
        ...threshold.value.sourceIds,
      ]),
      gaps: [],
    }),
    dimension("procedural-posture-and-route", {
      state: "mapped",
      reading:
        "The Supreme Court decided HMRC's appeal in judicial-review proceedings about follower and accelerated-payment notices. The underlying tax appeal remained separate.",
      casePointers: [
        supremeCourtOutcome.pointer,
        followerNotice.pointer,
        acceleratedNotice.pointer,
        taxBoundary.pointer,
      ],
      sourceIds: uniqueSorted([
        ...supremeCourtOutcome.value.sourceIds,
        ...followerNotice.value.sourceIds,
        ...acceleratedNotice.value.sourceIds,
        ...taxBoundary.value.sourceIds,
      ]),
      gaps: [],
    }),
    dimension("questions-and-issues", {
      state: "partial",
      reading:
        `${caseRecord.publicInterestQuestion} The canonical packet separately maps Issues 1 and 2, but not every issue decided by the Supreme Court.`,
      casePointers: [
        "/publicInterestQuestion",
        threshold.pointer,
        precedent.pointer,
      ],
      sourceIds: uniqueSorted([
        ...threshold.value.sourceIds,
        ...precedent.value.sourceIds,
      ]),
      gaps: [
        "Issue 3, whether factual findings form part of the 'principles laid down or reasoning given' for Finance Act 2014 section 205(3)(b), is not separately mapped in the canonical case record.",
        "Issue 4, whether Finance Act 2014 section 206 invalidated the notice because HMRC did not adequately explain why Smallwood determined the case, is not separately mapped in the canonical case record.",
      ],
    }),
    dimension("material-and-disputed-facts", {
      state: "partial",
      reading:
        "The packet maps the trust arrangements, notice issue, stated demand and procedural outcomes. It does not reproduce the complete evidential record or every disputed fact.",
      casePointers: [
        "/timeline/0",
        "/timeline/1",
        "/financialEffect/documentedAmounts/0",
      ],
      sourceIds: uniqueSorted(
        caseRecord.timeline
          .slice(0, 2)
          .flatMap((event) => event.sourceIds),
      ),
      gaps: [
        "Complete witness, documentary and agreed-fact records are not mapped.",
      ],
    }),
    dimension("governing-rules-and-authorities", {
      state: "partial",
      reading:
        "The packet maps the statutory threshold through the court's findings and identifies Smallwood as the earlier authority. It does not extract a provision-by-provision primary-law ledger.",
      casePointers: [threshold.pointer, precedent.pointer],
      sourceIds: uniqueSorted([
        ...threshold.value.sourceIds,
        ...precedent.value.sourceIds,
      ]),
      gaps: [
        "Exact primary-legislation provision records and a complete authority table are not mapped.",
      ],
    }),
    dimension("party-arguments", {
      state: "not-mapped",
      reading:
        "The packet does not give a complete, side-by-side account of each party's pleaded arguments and concessions.",
      casePointers: [],
      sourceIds: [],
      gaps: [
        "Map each party's grounds, submissions, concessions and requested disposition from the judgment and filed materials.",
      ],
    }),
    dimension("evidence-burden-and-standard", {
      state: "partial",
      reading:
        "The court's reasons expose HMRC's recorded level of confidence—likely rather than the statutory 'would' threshold—but the packet does not map every burden, standard and evidential item.",
      casePointers: [threshold.pointer],
      sourceIds: uniqueSorted(threshold.value.sourceIds),
      gaps: [
        "A full burden-and-standard map and the complete contemporaneous decision record are not included.",
      ],
    }),
    dimension("decisive-reasoning", {
      state: "partial",
      reading:
        "The packet maps two independently sufficient issue branches: the statutory threshold was not met, and HMRC overstated what the earlier ruling established. The second branch's separate relief step is not mapped.",
      casePointers: [threshold.pointer, precedent.pointer],
      sourceIds: uniqueSorted([
        ...threshold.value.sourceIds,
        ...precedent.value.sourceIds,
      ]),
      gaps: [
        "The Senior Courts Act 1981 section 31(2A) materiality and relief analysis attached to the Smallwood misdirection is not separately mapped.",
      ],
    }),
    dimension("supporting-and-rejected-reasoning", {
      state: "partial",
      reading:
        "The access-to-justice effect supports a restrictive reading of the power. The packet also records boundaries, but not a complete inventory of every rejected submission.",
      casePointers: [
        access.pointer,
        taxBoundary.pointer,
        meritsLoss.pointer,
      ],
      sourceIds: uniqueSorted([
        ...access.value.sourceIds,
        ...taxBoundary.value.sourceIds,
        ...meritsLoss.value.sourceIds,
      ]),
      gaps: [
        "Every rejected or alternative argument is not mapped.",
        "The canonical record does not separately map the court's treatment of Issues 3 and 4.",
      ],
    }),
    dimension("holding-and-disposition", {
      state: "mapped",
      reading:
        "The Supreme Court unanimously dismissed HMRC's appeal, leaving both notices quashed.",
      casePointers: [
        supremeCourtOutcome.pointer,
        followerNotice.pointer,
        acceleratedNotice.pointer,
      ],
      sourceIds: uniqueSorted([
        ...supremeCourtOutcome.value.sourceIds,
        ...followerNotice.value.sourceIds,
        ...acceleratedNotice.value.sourceIds,
      ]),
      gaps: [],
    }),
    dimension("remedies-money-and-costs", {
      state: "partial",
      reading:
        `${caseRecord.financialEffect.headline}. The notices were quashed; the packet identifies no damages award or established net recovery and does not quantify complete costs.`,
      casePointers: [
        followerNotice.pointer,
        acceleratedNotice.pointer,
        "/financialEffect",
      ],
      sourceIds: uniqueSorted([
        ...followerNotice.value.sourceIds,
        ...acceleratedNotice.value.sourceIds,
        ...caseRecord.financialEffect.downside.sourceIds,
      ]),
      gaps: [
        "The complete costs, funding, interest and tax-on-recovery record is not mapped.",
        "The Senior Courts Act 1981 section 31(2A) materiality and relief analysis is not separately mapped, so this view does not imply that every legal error produces quashing.",
      ],
    }),
    dimension(
      "later-history-transfer-limits-and-counterfactuals",
      {
        state: "partial",
        reading:
          "The later merits appeal failed. Transfer to another matter requires the exact current power, notice, reasoning record, route, facts and clock; similarity alone is not enough.",
        casePointers: [
          ...laterMeritsEvents.map(({ pointer }) => pointer),
          meritsLoss.pointer,
          "/applicability",
        ],
        sourceIds: uniqueSorted([
          ...laterMeritsEvents.flatMap(({ event }) => event.sourceIds),
          ...meritsLoss.value.sourceIds,
          ...caseRecord.applicability.sourceIds,
        ]),
        gaps: [
          "No new person's facts, decision document, current deadline or professional assessment is present.",
        ],
      },
    ),
  ];

  const majorChallenges: TaxDisputeMajorChallenge[] = [
    {
      id: "challenge:statutory-threshold",
      kind: "statutory-interpretation",
      materiality: "decisive",
      state: "resolved-in-decision",
      description:
        "The court had to determine the certainty Parliament required before HMRC could issue a penalty-backed follower notice.",
      impact:
        "Treating 'would' as mere likelihood would widen a power that could deter continuation of an appeal.",
      evidenceNeeded: [
        "The current statutory text",
        "The notice",
        "The decision-maker's contemporaneous reasoning",
      ],
      blockers: [],
      resolution: threshold.value.statement,
      casePointers: [threshold.pointer],
      sourceIds: uniqueSorted(threshold.value.sourceIds),
    },
    {
      id: "challenge:precedent-scope",
      kind: "authority-and-precedent",
      materiality: "decisive",
      state: "bounded-by-record",
      description:
        "HMRC treated indicators in Smallwood as if they inevitably determined the result.",
      impact:
        "The scope of the earlier ruling determined whether the statutory notice condition could be met.",
      evidenceNeeded: [
        "The earlier decision",
        "The later facts and arguments",
        "The decision-maker's account of why the cases match",
      ],
      blockers: [
        "The canonical case record does not separately map the Senior Courts Act 1981 section 31(2A) materiality and relief step for this issue branch.",
      ],
      resolution:
        `${precedent.value.statement} The mapped proposition is only part of the branch; the separate relief step remains an explicit gap.`,
      casePointers: [precedent.pointer],
      sourceIds: uniqueSorted(precedent.value.sourceIds),
    },
    {
      id: "challenge:access-to-justice",
      kind: "timing-and-procedure",
      materiality: "material",
      state: "resolved-in-decision",
      description:
        "The penalty risk put pressure on a taxpayer to abandon an independent appeal.",
      impact:
        "That practical interference supported a restrictive reading of the statutory power.",
      evidenceNeeded: [
        "The applicable penalty regime",
        "The appeal route",
        "The practical consequence of non-compliance",
      ],
      blockers: [],
      resolution: access.value.statement,
      casePointers: [access.pointer, noPenalty.pointer],
      sourceIds: uniqueSorted([
        ...access.value.sourceIds,
        ...noPenalty.value.sourceIds,
      ]),
    },
    {
      id: "challenge:procedure-versus-merits",
      kind: "later-history",
      materiality: "material",
      state: "bounded-by-record",
      description:
        "Success in reviewing the notices did not decide the separate underlying tax liability.",
      impact:
        "Collapsing the two routes would turn a procedural remedy into a false claim of substantive tax success.",
      evidenceNeeded: [
        "The exact order in the public-law proceedings",
        "The complete later merits history",
      ],
      blockers: [
        "The packet does not reproduce every later merits issue and reason.",
      ],
      resolution:
        "The notices stayed quashed, while the later underlying tax appeal failed.",
      casePointers: [
        taxBoundary.pointer,
        meritsLoss.pointer,
        ...laterMeritsEvents.map(({ pointer }) => pointer),
      ],
      sourceIds: uniqueSorted([
        ...taxBoundary.value.sourceIds,
        ...meritsLoss.value.sourceIds,
        ...laterMeritsEvents.flatMap(({ event }) => event.sourceIds),
      ]),
    },
    {
      id: "challenge:money-meaning",
      kind: "remedy-and-enforcement",
      materiality: "material",
      state: "bounded-by-record",
      description:
        "A large accelerated demand was affected, but it was not a damages award, refund or established net recovery.",
      impact:
        "Using the demand as a gain would materially misstate the decided remedy and financial result.",
      evidenceNeeded: [
        "Payment and repayment records",
        "Any separate money cause of action",
        "Costs, interest, funding and tax-on-recovery records",
      ],
      blockers: [
        "The public packet does not contain a complete net-recovery record.",
      ],
      resolution:
        `${caseRecord.financialEffect.headline}; ${caseRecord.financialEffect.netRecovery.reason}`,
      casePointers: [
        "/financialEffect/documentedAmounts/0",
        "/financialEffect/damagesAward",
        "/financialEffect/netRecovery",
      ],
      sourceIds: uniqueSorted([
        ...caseRecord.financialEffect.documentedAmounts[0]!.sourceIds,
        ...acceleratedNotice.value.sourceIds,
      ]),
    },
    {
      id: "challenge:transfer-to-new-facts",
      kind: "transfer-to-new-facts",
      materiality: "material",
      state: "open-for-new-case",
      description:
        "The reasoning pattern can guide questions, but it cannot decide a new dispute without the new power, facts, route and timing.",
      impact:
        "Uncontrolled analogy would turn historical research into unsupported legal advice or outcome prediction.",
      evidenceNeeded: [
        "The current statutory power and guidance",
        "The complete notice and decision record",
        "Material similarities and differences",
        "The applicable review, appeal or judicial-review clock",
        "Qualified matter-specific review",
      ],
      blockers: [
        "No new person's facts or documents are accepted by this public API.",
      ],
      resolution: caseRecord.applicability.assessmentRoute,
      casePointers: ["/applicability"],
      sourceIds: uniqueSorted(caseRecord.applicability.sourceIds),
    },
  ];

  const holding =
    "The Supreme Court dismissed HMRC's appeal and left the follower and accelerated-payment notices quashed. The mapped record identifies two independently sufficient issue branches: the statutory threshold was not met, and HMRC had overstated the earlier authority; the second branch's separate relief step remains explicitly unmapped.";

  return {
    schema: "taxsorted.uk.tax-dispute-interpretation/1",
    frameworkVersion: TAX_DISPUTE_FRAMEWORK.version,
    packet: {
      schema: input.sourcePacket?.schema ?? null,
      digest: input.sourcePacket?.digest ?? null,
      corpusVersion: input.corpusVersion,
      lawAsAt: input.lawAsAt,
    },
    case: {
      id: caseRecord.id,
      slug: caseRecord.slug,
      title: caseRecord.title,
      citation: caseRecord.citation,
      territory: caseRecord.territory,
      subject: caseRecord.subject,
      status: caseRecord.caseStatus,
    },
    dimensions,
    majorChallenges,
    reasoning: {
      hiddenChainOfThought: false,
      publicRationaleOnly: true,
      holding,
      decisiveReasonIds: [
        "reason:threshold-not-met",
        "reason:earlier-ruling-overstated",
      ],
      steps: reasonSteps,
    },
    outcomes: {
      procedural: {
        status: "notices-quashed",
        summary:
          "HMRC's appeal was dismissed and the follower and accelerated-payment notices remained quashed.",
        casePointers: [
          supremeCourtOutcome.pointer,
          followerNotice.pointer,
          acceleratedNotice.pointer,
        ],
        sourceIds: uniqueSorted([
          ...supremeCourtOutcome.value.sourceIds,
          ...followerNotice.value.sourceIds,
          ...acceleratedNotice.value.sourceIds,
        ]),
      },
      underlyingMerits: {
        status: "later-tax-appeal-lost",
        summary: meritsLoss.value.statement,
        casePointers: [
          meritsLoss.pointer,
          ...laterMeritsEvents.map(({ pointer }) => pointer),
        ],
        sourceIds: uniqueSorted([
          ...meritsLoss.value.sourceIds,
          ...laterMeritsEvents.flatMap(({ event }) => event.sourceIds),
        ]),
      },
      money: {
        status: caseRecord.financialEffect.status,
        summary:
          `${caseRecord.financialEffect.headline}. ${caseRecord.financialEffect.damagesAward.reason} ${caseRecord.financialEffect.netRecovery.reason}`,
        casePointers: ["/financialEffect"],
        sourceIds: uniqueSorted([
          ...caseRecord.financialEffect.documentedAmounts.flatMap(
            (amount) => amount.sourceIds,
          ),
          ...caseRecord.financialEffect.downside.sourceIds,
        ]),
      },
    },
    review: {
      adapter: "uk.haworth-v-hmrc-2021",
      qualifiedLegalReviewAsserted: false,
      sourcePacketDigestSupplied: Boolean(input.sourcePacket),
      limits:
        "This deterministic adapter checks a written public-case mapping. It does not itself approve publication, assert qualified legal review or assess a new matter.",
    },
    boundaries: [
      ...TAX_DISPUTE_FRAMEWORK.boundaries,
      "The public-law win on the notices and the later loss on underlying tax liability are different outcomes.",
      "The affected demand is not a damages award, refund or established net recovery.",
      "Source pinpoints are editorial locators and must be checked against the official documents.",
    ],
  };
}

export function buildUkTaxDisputeInterpretation(
  input: BuildUkTaxDisputeInterpretationInput,
): UkTaxDisputeInterpretation {
  if (input.caseRecord.id !== HAWORTH_CASE_ID) {
    throw new Error(
      `No mapped tax-dispute interpretation adapter is admitted for ${input.caseRecord.id}`,
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.lawAsAt)) {
    throw new Error("Tax-dispute interpretation lawAsAt must use YYYY-MM-DD");
  }
  if (!input.corpusVersion.trim()) {
    throw new Error("Tax-dispute interpretation needs a corpus version");
  }
  if (
    input.sourcePacket &&
    !/^sha256:[0-9a-f]{64}$/u.test(input.sourcePacket.digest)
  ) {
    throw new Error("Tax-dispute source packet digest must be SHA-256");
  }
  return buildHaworthInterpretation(input);
}
