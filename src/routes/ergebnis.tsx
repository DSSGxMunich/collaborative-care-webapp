import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CareRanking } from "@/components/CareRanking";
import { ExamplePopover } from "@/components/ExamplePopover";
import { InfoTooltip } from "@/components/InfoTooltip";
import { fill, ui, useLang } from "@/lib/i18n";
import { PHQ9_MAX } from "@/components/OutcomeStrip";
import { SEVERITY_LABEL, SEVERITY_RANGE, type Severity } from "@/lib/phq9";
import type { Scenario } from "@/lib/model";
import { generateResultsPdf } from "@/lib/pdf";
import { usePrediction } from "@/lib/usePrediction";
import { ageFromBirthDate, SEX_OPTIONS } from "@/lib/session";
import { chunk } from "@/lib/utils";
import { WaitingBlocker } from "@/components/WaitingBlocker";
import resultsContent from "@/content/results.json";

export const Route = createFileRoute("/ergebnis")({
  head: () => ({
    meta: [
      { title: "Ihre Auswertung – Versorgungskompass" },
      { name: "description", content: resultsContent.title.de },
    ],
  }),
  component: Results,
});

const r = resultsContent;

/** Where the PHQ-9 severity bands start (0–4, 5–9, 10–14, 15–19, 20–27). */
const SEVERITY_CUTOFFS = [5, 10, 15, 20];

/**
 * Today's PHQ-9 score, read top to bottom: the number, its severity band,
 * then a 0–27 scale with a marker. The scale says "lower is better" three
 * ways at once (end labels, an arrow sentence, and a green → red fill), so
 * nobody reads a high score as a good one.
 */
function CurrentScore({ score, severity }: { score: number; severity: Severity }) {
  const { tr } = useLang();
  const c = r.currentScore;
  const pos = `${(Math.min(PHQ9_MAX, Math.max(0, score)) / PHQ9_MAX) * 100}%`;

  return (
    <div className="mt-6 border-b border-border pb-5">
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-muted-foreground">{tr(c.label)}</p>
        <InfoTooltip
          description={tr(c.info)}
          ariaLabel={tr(c.infoAria)}
          panelClassName="w-72"
          triggerClassName="flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-muted-foreground/60 text-[10px] font-semibold leading-none text-muted-foreground hover:border-muted-foreground hover:text-foreground"
        >
          <span aria-hidden="true">i</span>
        </InfoTooltip>
      </div>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tabular-nums leading-none">{score}</span>
        <span className="text-sm text-muted-foreground">{tr(c.outOf27)}</span>
      </p>
      <p className="mt-2 text-sm font-medium">
        {tr(SEVERITY_LABEL[severity])}{" "}
        <span className="whitespace-nowrap font-normal text-muted-foreground">
          {fill(tr(c.range), { range: SEVERITY_RANGE[severity] })}
        </span>
      </p>

      {/* The scale is decorative: every fact on it is also stated in text above/below. */}
      <div aria-hidden className="mt-8 max-w-md">
        <div className="relative">
          {/* Near either end, anchor the label to the marker's inner side so it stays inside the scale. */}
          <div
            className={`absolute bottom-full mb-1.5 ${score <= 2 ? "" : score >= PHQ9_MAX - 2 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: pos }}
          >
            <span className="whitespace-nowrap text-xs font-semibold tabular-nums">
              {fill(tr(c.you), { score })}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-linear-to-r from-success/55 via-warning/50 to-destructive/55">
            {SEVERITY_CUTOFFS.map((t) => (
              <span
                key={t}
                className="absolute inset-y-0 w-0.5 bg-background"
                style={{ left: `${(t / PHQ9_MAX) * 100}%` }}
              />
            ))}
          </div>
          <span
            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
            style={{ left: pos }}
          />
        </div>
        <div className="mt-1.5 flex justify-between gap-4 text-[11px] text-muted-foreground">
          <span>{tr(c.min)}</span>
          <span className="text-right">{tr(c.max)}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">← {tr(c.direction)}</p>
    </div>
  );
}
/**
 * The trial-eligibility disclaimer, now placed above the results in reading
 * order rather than beside them in a sidebar. Sitting first doesn't mean
 * gating: only the heading and one-sentence intro show by default, so the
 * note registers at a glance without making the reader clear a wall of text
 * before reaching their results. The exclusion criteria and closing line —
 * the part worth reading closely if it applies to you — stay a tap away
 * behind "show details".
 *
 * Each criterion is a short topic label with an optional smaller-font
 * description underneath, not a full sentence — and the "N of 12 studies
 * excluded them" clause, which used to repeat verbatim on every line, is now
 * a column header (countHeader) sitting directly above the fractions it
 * describes, via InfoTooltip, rather than a sentence people can skim past.
 */
function DisclaimerCard() {
  const { tr } = useLang();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-md border border-warning/30 bg-warning-soft p-4">
      <h2 className="text-sm font-semibold">{tr(r.prototypeNote.heading)}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {tr(r.prototypeNote.intro)}
      </p>
      {expanded && (
        <>
          <div className="mt-3 flex justify-end">
            <InfoTooltip description={tr(r.prototypeNote.countNote)} align="end">
              {tr(r.prototypeNote.countHeader)}
            </InfoTooltip>
          </div>
          <dl className="mt-1 divide-y divide-warning/20 text-sm">
            {r.prototypeNote.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-2">
                <dt>
                  <span className="font-medium">{tr(item.label)}</span>
                  {"description" in item ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {tr(item.description)}
                    </span>
                  ) : null}
                </dt>
                <dd className="shrink-0 whitespace-nowrap pt-0.5 text-xs tabular-nums text-muted-foreground">
                  {item.excludedIn}/{r.prototypeNote.totalStudies}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm font-medium leading-relaxed">{tr(r.prototypeNote.closing)}</p>
        </>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-medium text-primary underline underline-offset-2"
      >
        {tr(expanded ? r.prototypeNote.hideDetails : r.prototypeNote.showDetails)}
      </button>
    </div>
  );
}

function Results() {
  const { tr } = useLang();
  const p = usePrediction();
  const [revealed, setRevealed] = useState(false);

  if (!p.hydrated) return <div className="mx-auto max-w-2xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">{tr(r.title)}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{tr(ui.noData)}</p>
        <Link
          to="/fragebogen"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(ui.buttons.start)}
        </Link>
      </div>
    );
  }

  if (p.session.mode === "waitingRoom" && !p.session.unlocked) {
    return <WaitingBlocker />;
  }

  if (!revealed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold">{tr(r.thankYou.title)}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(r.thankYou.body)}</p>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            {tr(r.thankYou.seeResults)}
          </button>
          <Link
            to="/angebote"
            className="block w-full rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium hover:bg-secondary"
          >
            {tr(r.thankYou.seeSupport)}
          </Link>
          <p className="pt-1 text-xs text-muted-foreground">{tr(r.thankYou.privacyNote)}</p>
        </div>
      </div>
    );
  }

  const activeScenarios = p.scenarios;

  /** Usual care keeps its own short label; a package's (or single component's) label is its active components joined together. */
  const scenarioLabel = (scenario: Scenario) =>
    scenario.id === "usualCare"
      ? tr(r.scenarios.usualCare.short)
      : scenario.components.map((id) => tr(r.components[id].short)).join(" + ");

  /**
   * Same components as scenarioLabel, but as an array of lines instead of
   * one joined string, since CareRanking renders each line separately.
   * Every scenario here has 0 or 1 component, so this always returns a
   * single-element array — this chunking logic carries over from when
   * packages could combine up to 4 components, but is harmless (and
   * correct) for today's single-component-only scenarios.
   */
  const scenarioLabelLines = (scenario: Scenario): string[] =>
    scenario.id === "usualCare"
      ? [tr(r.scenarios.usualCare.short)]
      : chunk(
          scenario.components.map((id) => tr(r.components[id].short)),
          2,
        ).map((group) => group.join(" + "));

  /** Every row is a single component added alone, so it always has one unambiguous explanation to show. */
  const scenarioDescription = (scenario: Scenario): string | undefined => {
    const [id] = scenario.components;
    return id !== undefined && scenario.components.length === 1
      ? tr(r.components[id].description)
      : undefined;
  };

  /** A component is flagged "likely to help" when its expected outcome beats the patient's own baseline — no magnitude shown, just the direction. */
  const isHelpful = (scenario: Scenario) => scenario.expectedEndpoint < p.baseline;

  const rankedScenarios = activeScenarios.filter((s) => s.id !== "usualCare");
  const usualCareScenario = activeScenarios.find((s) => s.id === "usualCare");

  const scenarioTableRows = (scenarios: Scenario[]) =>
    scenarios.map((scenario) => {
      const isUsualCare = scenario.id === "usualCare";
      const rank = isUsualCare ? "–" : String(rankedScenarios.indexOf(scenario) + 1);
      return {
        label: scenarioLabel(scenario),
        description: isUsualCare
          ? `${tr(r.scenarios.usualCare.description)} ${tr(r.scenarios.usualCare.note)}`
          : scenarioDescription(scenario),
        rank,
        note: !isUsualCare && isHelpful(scenario) ? tr(r.legend.better) : "–",
      };
    });

  const downloadPdf = () => {
    generateResultsPdf({
      filenamePrefix: tr({ de: "meine-auswertung", en: "my-results" }),
      title: tr(r.title),
      subtitle: tr(r.pdf.subtitle),
      baselineLabel: tr(r.currentScore.label),
      baselineValue: `${p.baseline} ${tr(r.currentScore.outOf27)}`,
      severityValue: `${tr(SEVERITY_LABEL[p.severity])} ${fill(tr(r.currentScore.range), { range: SEVERITY_RANGE[p.severity] })}`,
      scenariosHeading: tr(r.whatCanBeExpected),
      scenariosBody: tr(r.whatCanBeExpectedBody),
      modelHeading: tr(r.whatCanBeExpected),
      tableHeaders: {
        careComponent: tr(r.pdf.table.careComponent),
        rank: tr(r.pdf.table.rank),
        note: tr(r.pdf.table.note),
      },
      scenarioTables: [
        {
          heading: tr(r.scenarioTabs.single),
          // Usual care last, as the comparison row, matching the page.
          rows: scenarioTableRows([
            ...rankedScenarios,
            ...(usualCareScenario ? [usualCareScenario] : []),
          ]),
        },
      ],
      predictorsHeading: tr(r.aboutEstimates.heading),
      predictorsBody: [r.aboutEstimates.research, r.aboutEstimates.ranking, r.predictorsNote]
        .map((text) => tr(text))
        .join(" "),
      predictorRows: [
        { label: tr(r.predictors.baseline.label), value: `${p.baseline}/27` },
        {
          label: tr(r.predictors.age.label),
          value: p.session.profile.birthDate
            ? ageFromBirthDate(p.session.profile.birthDate).toFixed(2)
            : tr(r.predictors.notProvided),
        },
        {
          label: tr(r.predictors.sex.label),
          value: p.session.profile.sex
            ? tr(
                SEX_OPTIONS.find((o) => o.value === p.session.profile.sex)?.label ?? {
                  de: "–",
                  en: "–",
                },
              )
            : tr(r.predictors.notProvided),
        },
      ],
      footer: tr(r.pdf.footer),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <DisclaimerCard />

      <div className="mt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{tr(r.title)}</h1>
          <button
            type="button"
            onClick={downloadPdf}
            className="rounded-md border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary print:hidden"
          >
            {tr(r.actions.downloadPdf)}
          </button>
        </div>

        <CurrentScore score={p.baseline} severity={p.severity} />

        {/* ---------------- The result: ranked care components ---------------- */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{tr(r.whatCanBeExpected)}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {tr(r.whatCanBeExpectedBody)}
          </p>

          {usualCareScenario && (
            <div className="mt-5">
              <CareRanking
                usualCare={usualCareScenario}
                ranked={rankedScenarios}
                labelLines={scenarioLabelLines}
                description={scenarioDescription}
                helpful={isHelpful}
                usualCareDescription={tr(r.scenarios.usualCare.description)}
                usualCareNote={tr(r.scenarios.usualCare.note)}
                helpfulSectionLabel={tr(r.ranking.helpfulSection)}
                otherSectionLabel={tr(r.ranking.otherSection)}
                comparisonSectionLabel={tr(r.ranking.comparisonSection)}
                rankAriaLabel={(rank, total) => fill(tr(r.ranking.rankAria), { rank, total })}
                example={() => (
                  <ExamplePopover
                    buttonLabel="Example from a study"
                    heading="How this looked in a study"
                    text="[PLACEHOLDER — real text from the team] In one of the studies, a psychiatrist met the care manager once a week to review all patients on the list and suggested changes to treatment where symptoms were not improving. Patients did not need to see the psychiatrist themselves."
                    source="[Placeholder source: Study name, country, year]"
                    closeLabel="Close"
                  />
                )}
                outcome={{
                  baseline: p.baseline,
                  todayLabel: tr(r.legend.today),
                  expectedLabel: () => tr(r.legend.expected),
                  lowLabel: tr(r.legend.fewer),
                  highLabel: tr(r.legend.more),
                  legend: {
                    expected: tr(r.legend.expected),
                    helpful: tr(r.legend.helpful),
                    reference: tr(r.legend.reference),
                    interval: tr(r.legend.interval),
                    today: tr(r.legend.today),
                    scale: tr(r.legend.scale),
                  },
                }}
              />
            </div>
          )}
        </section>

        {/* ---------------- About these estimates: research basis + inputs ---------------- */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{tr(r.aboutEstimates.heading)}</h2>
          <div className="mt-1.5 max-w-xl space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>{tr(r.aboutEstimates.research)}</p>
            <p>{tr(r.aboutEstimates.ranking)}</p>
            <p>{tr(r.predictorsNote)}</p>
          </div>

          <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{tr(r.predictors.baseline.label)}</dt>
              <dd className="font-medium">{p.baseline}/27</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{tr(r.predictors.age.label)}</dt>
              <dd className="font-medium">
                {p.session.profile.birthDate
                  ? ageFromBirthDate(p.session.profile.birthDate).toFixed(2)
                  : tr(r.predictors.notProvided)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{tr(r.predictors.sex.label)}</dt>
              <dd className="font-medium">
                {p.session.profile.sex
                  ? tr(
                      SEX_OPTIONS.find((o) => o.value === p.session.profile.sex)?.label ?? {
                        de: "–",
                        en: "–",
                      },
                    )
                  : tr(r.predictors.notProvided)}
              </dd>
            </div>
          </dl>
          <Link
            to="/methodology"
            className="mt-3 inline-flex text-sm font-medium underline underline-offset-2"
          >
            {tr(r.aboutEstimates.methodologyLink)}
          </Link>
        </section>

        <div className="mt-10 flex flex-wrap gap-2">
          <Link
            to="/praxis"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {tr(r.actions.clinicianSummary)}
          </Link>
          <Link
            to="/angebote"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            {tr(r.actions.localSupport)}
          </Link>
        </div>
      </div>
    </div>
  );
}
