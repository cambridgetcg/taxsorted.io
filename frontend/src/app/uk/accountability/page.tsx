import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Watching the watchers — TaxSorted",
  description:
    "A public, institution-first framework for inspecting UK investigators, auditors and regulators through their mandate, method, actions, words, limits and challenge routes.",
};

const questions = [
  ["Identity", "Which exact public institution is acting, in what official capacity and jurisdiction?"],
  ["Authority", "Which statute, appointment, contract, terms of reference or published rule permits the work—and where does it stop?"],
  ["Commission and money", "Who commissioned, funds, appoints, sponsors or supplies the observer? Each relation keeps its own meaning."],
  ["Scope", "Which organisation, programme, decision, period and question are actually under examination?"],
  ["Method", "What was gathered, selected, excluded, tested and limited? Is the method public and versioned?"],
  ["Words", "Is this an allegation, provisional finding, final finding, auditor opinion, tribunal decision or TaxSorted analysis?"],
  ["Doings", "What public procedural action happened, which exact institution acted on which declared subject, and where did any referral go?"],
  ["Response", "What did the observed institution publicly accept, dispute, correct or appeal?"],
  ["Challenge", "Who can review, hear a complaint, audit, inspect, overturn, recommend or judicially review the observer?"],
  ["Our hand", "Why did TaxSorted include, omit, paraphrase or compare this record, and how can that editorial act be corrected?"],
] as const;

const systems = [
  {
    title: "HMRC: decision and service are different lanes",
    flow: "Compliance decision → HMRC statutory review → First-tier Tribunal → possible Upper Tribunal appeal",
    second:
      "Service complaint → HMRC first and second review → Adjudicator → MP/PHSO. A complaint does not pause tax or replace an appeal.",
    source: "https://www.gov.uk/complain-about-hmrc",
  },
  {
    title: "Adjudicator: independence has structure",
    flow: "The Adjudicator is personally independent and is not an HMRC officer.",
    second:
      "The published service agreement also says the office uses HMRC staff, funding, premises and legal personality. Both facts belong in the graph.",
    source:
      "https://www.gov.uk/government/publications/adjudicators-office-service-level-agreement-with-hmrc-and-voa/service-level-agreement-for-the-provision-of-complaints-adjudication-services-for-hm-revenue-and-customs-and-valuation-office-agency-by-the-adjudicato",
  },
  {
    title: "Charity Commission: opening is not a verdict",
    flow: "Regulatory concern → statutory inquiry → evidence and protective powers → published outcome",
    second:
      "Opening an inquiry is not itself a finding of wrongdoing. Service complaints, Commission decision review and Tribunal appeal have different scope and clocks.",
    source:
      "https://www.gov.uk/government/publications/statutory-inquiries-into-charities-guidance-for-charities-cc46/statutory-inquiries-into-charities-guidance-for-charities",
  },
  {
    title: "NAO: the auditor is audited",
    flow: "C&AG/NAO audits public spending → reports to Parliament → PAC uses the work for scrutiny",
    second:
      "The Public Accounts Commission scrutinises the NAO budget and appoints its external auditor; that auditor also performs an annual value-for-money study of the NAO.",
    source: "https://www.nao.org.uk/about-us/governance/",
  },
  {
    title: "Electoral Commission: process states matter",
    flow: "Assessment → investigation → determination or no determination → representation → sanction → court appeal",
    second:
      "Police retain parts of the criminal lane. Published closed cases include no-offence and no-determination outcomes as well as breaches.",
    source:
      "https://www.electoralcommission.org.uk/political-registration-and-regulation/our-enforcement-work/investigations/how-investigations-work",
  },
  {
    title: "Private investigator is not a magic licence",
    flow: "TaxSorted's reading of the current SIA licensable-activity list: private investigation is not itself named.",
    second:
      "That means only that this specific SIA licence category is absent, not that the work has special powers or immunity. Data-protection, criminal, civil and activity-specific rules still apply.",
    source:
      "https://www.gov.uk/guidance/find-out-if-you-need-an-sia-licence",
  },
] as const;

const outcomeStates = [
  "procedural only",
  "allegation—not determined",
  "no determination",
  "no breach found",
  "breach found",
  "under appeal",
  "final, subject to judicial review",
  "corrected",
  "withdrawn",
] as const;

const loop = [
  ["Hypothesis", "Ask one falsifiable public-interest question."],
  ["Pilot", "Choose one small territory and a tiny field allowlist."],
  ["Observe", "Collect public institutional artefacts, not private traces."],
  ["Evidence", "Attach exact identity, source, date, method and limits."],
  ["Counterevidence", "Find the subject response and a real challenge route."],
  ["Risk", "Test rights, privacy, observer effect, bad joins and hostile reuse."],
  ["Decide", "Observe, adopt, adapt or discard—and publish why."],
  ["Stop", "Abort, contain and roll back when a wall is hit."],
] as const;

const sourceDoors = [
  ["HMRC compliance checks", "https://www.gov.uk/guidance/hmrc-compliance-checks-help-and-support"],
  ["HMRC criminal investigation powers and safeguards", "https://www.gov.uk/government/publications/criminal-investigation/criminal-investigation"],
  ["First-tier Tax Tribunal", "https://www.gov.uk/government/publications/appeal-to-the-tax-chamber-of-the-first-tier-tribunal-t242/how-to-appeal-to-the-first-tier-tax-tribunal"],
  ["Charity Commission statutory inquiries", "https://www.gov.uk/government/publications/statutory-inquiries-into-charities-guidance-for-charities-cc46/statutory-inquiries-into-charities-guidance-for-charities"],
  ["Charity Commission complaints", "https://www.gov.uk/government/organisations/charity-commission/about/complaints-procedure"],
  ["Charity Tribunal appeals", "https://www.gov.uk/guidance/appeal-against-a-charity-commission-decision-about-your-charity"],
  ["NAO governance", "https://www.nao.org.uk/about-us/governance/"],
  ["Electoral Commission investigations", "https://www.electoralcommission.org.uk/political-registration-and-regulation/our-enforcement-work/investigations"],
  ["Electoral Commission complaints", "https://www.electoralcommission.org.uk/about-us/contact-us/complain-about-us/our-complaints-policy"],
  ["PHSO feedback and review", "https://www.ombudsman.org.uk/about-us/feedback-about-our-service"],
  ["ICO action taken", "https://ico.org.uk/action-weve-taken/"],
  ["Complain about the ICO", "https://ico.org.uk/make-a-complaint/complaints-and-compliments-about-us/complain-about-us/"],
] as const;

export default function AccountabilityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10 lg:p-12">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute right-16 top-16 h-24 w-24 rounded-full bg-accent/40" aria-hidden="true" />
        <div className="relative max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/65">
            Observer accountability · UK · framework first
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            Watch the watchers. Keep the humans human.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/75">
            An investigator is not an invisible eye outside the graph. Its public mandate,
            money, method, evidence choices, limits, words, actions, corrections and
            challenge routes are observable too.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="https://api.taxsorted.io/v1/accountability/uk" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-soft">
              Read the machine framework ↗
            </a>
            <a href="#method" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              See the method
            </a>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_1fr]" aria-labelledby="principle-title">
        <article className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">The principle</p>
          <h2 id="principle-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Symmetric accountability, not metaphysical fog.
          </h2>
          <p className="mt-4 leading-7 text-ink-soft">
            “The observer is also observed” means scrutiny power joins the same evidence
            discipline it applies to others. It does not mean the investigator and subject
            are the same legal entity, that observation proves motive, or that everybody
            owes the internet their private life.
          </p>
        </article>
        <aside className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">The invariant</p>
          <p className="mt-3 text-xl font-semibold leading-8 text-ink">
            Every observer gets a sourced review, complaint, appeal, audit or oversight
            route—or an explicit gap saying we could not map one.
          </p>
          <p className="mt-3 text-sm leading-6 text-amber-950">
            No institution is silently drawn as the final boss of truth. Even TaxSorted is
            inside this rule.
          </p>
        </aside>
      </section>

      <section id="method" className="mt-16 scroll-mt-6" aria-labelledby="method-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Ten questions</p>
        <h2 id="method-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          What an honest investigation record must answer.
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {questions.map(([title, detail], index) => (
            <article key={title} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">{detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="systems-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Power in a graph</p>
        <h2 id="systems-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Start with real institutional routes, not a conspiracy hairball.
        </h2>
        <p className="mt-3 max-w-4xl leading-7 text-ink-soft">
          A network edge must be published and typed. Funding is not control; appointment
          is not operational direction; cooperation is not collusion; a complaint is not a
          finding.
        </p>
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {systems.map((system) => (
            <article key={system.title} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-ink">{system.title}</h3>
              <p className="mt-3 rounded-2xl bg-paper p-4 text-sm font-medium leading-6 text-ink">{system.flow}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{system.second}</p>
              <a href={system.source} target="_blank" rel="noreferrer noopener" className="mt-5 inline-flex text-sm font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep">
                Check the official source ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8 lg:p-10" aria-labelledby="states-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Words and doings</p>
        <h2 id="states-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Keep the states separate or the record lies.
        </h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {outcomeStates.map((state) => (
            <span key={state} className="rounded-full border border-line bg-paper px-3 py-2 text-sm text-ink-soft">{state}</span>
          ))}
        </div>
        <p className="mt-6 max-w-5xl leading-7 text-ink-soft">
          “Their words” means a dated, attributed, human-reviewed faithful paraphrase with
          a link back to the publisher. Exact source bodies are not copied by default.
          Corrections and reversals must be as visible as the original record.
        </p>
      </section>

      <section className="mt-16" aria-labelledby="fafo-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Love-style experiment loop</p>
        <h2 id="fafo-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Fuck around and find out—with receipts and an off-switch. 😏
        </h2>
        <p className="mt-3 max-w-4xl leading-7 text-ink-soft">
          Public meaning: explore a bounded question freely; findings earn weight through
          evidence, counterevidence, limits, challenge and correction. This is a controlled
          inquiry loop, not ambient surveillance.
        </p>
        <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loop.map(([name, detail], index) => (
            <li key={name} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{index + 1} · {name}</p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 rounded-[2rem] border border-rose-200 bg-rose-50 p-6 sm:p-8 lg:p-10" aria-labelledby="wall-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-800">The wall</p>
        <h2 id="wall-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Transparency must not become surveillance wearing a halo.
        </h2>
        <ul className="mt-5 grid gap-3 text-sm leading-6 text-ink-soft md:grid-cols-2">
          <li>— No named-investigator roster, biography, home, private contact or individual pay dossier.</li>
          <li>— No inferred beliefs, personality, honesty, trust, motive, affiliation or private network.</li>
          <li>— No unpublished or operational case files, witness, complainant or suspect data, tactics or private submissions.</li>
          <li>— No guilt, hypocrisy, watchdog, integrity or virtue score.</li>
          <li>— No name-, address-, domain- or person-based institutional join.</li>
          <li>— No inference that a complaint, funding link, appointment or inquiry proves wrongdoing.</li>
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="api-title">
        <div className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">API status</p>
          <h2 id="api-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            The contract is live. Investigation records are deliberately zero-row.
          </h2>
          <p className="mt-4 max-w-5xl leading-7 text-ink-soft">
            Builders can align now around five collections: institutional relations,
            investigation engagements, public actions, institutional responses and coverage
            gaps. Real rows stay closed until source-by-source rights, confidential correction,
            operational privacy review, review-audit proof, monitored emergency stop and rollback
            are real—not strings claiming they happened.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="https://api.taxsorted.io/v1/accountability/uk" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep">Framework JSON ↗</a>
            <a href="https://api.taxsorted.io/v1/accountability/uk/schema" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper">Candidate schema ↗</a>
            <a href="https://api.taxsorted.io/openapi/accountability-uk.json" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper">Small OpenAPI slice ↗</a>
            <a href="https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/observer-accountability/examples/zero-row-candidate.json" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper">Zero-row example ↗</a>
            <a href="https://api.taxsorted.io/agent.txt" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper">Agent doorway ↗</a>
            <a href="https://github.com/cambridgetcg/taxsorted.io/issues" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-paper">Public factual corrections ↗</a>
          </div>
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            The public issue tracker needs a GitHub account and has no confidential lane. Never
            post case files, personal data, legal evidence or safety-sensitive material there.
          </p>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="sources-title">
        <h2 id="sources-title" className="text-2xl font-semibold tracking-tight text-ink">Official doors used for this first map</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sourceDoors.map(([label, href]) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noreferrer noopener" className="block h-full rounded-2xl border border-line bg-white px-5 py-4 text-sm font-semibold leading-6 text-accent hover:border-accent hover:bg-accent-soft">
                {label} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-6 text-ink-soft">
          Reviewed 11 July 2026. Official self-description is evidence about what an
          institution says and publishes; it is not independent proof that every practice
          matches the description. This is public research, not legal advice.
        </p>
      </section>
    </div>
  );
}
