import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CareRanking } from "@/components/CareRanking";
import { InfoTooltip } from "@/components/InfoTooltip";
import { fill, ui, useLang } from "@/lib/i18n";
import { SEVERITY_LABEL, SEVERITY_RANGE } from "@/lib/phq9";
import type { Scenario } from "@/lib/model";
import { generateResultsPdf } from "@/lib/pdf";
import { usePrediction } from "@/lib/usePrediction";
import { ageFromBirthDate, SEX_OPTIONS } from "@/lib/session";
import { chunk } from "@/lib/utils";
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
        rank,
        note: !isUsualCare && isHelpful(scenario) ? tr(r.legend.better) : "–",
      };
    });

  const downloadPdf = () => {
    generateResultsPdf({
      filenamePrefix: tr({ de: "meine-auswertung", en: "my-results" }),
      title: tr(r.title),
      subtitle: tr(r.pdf.subtitle),
      baselineLabel: `${r.phq9Label} ${tr(r.of27)}`,
      baselineValue: `${p.baseline}/27`,
      severityValue: `${tr(SEVERITY_LABEL[p.severity])} · ${tr(r.range)} ${SEVERITY_RANGE[p.severity]}`,
      scenariosHeading: tr(r.whatCanBeExpected),
      scenariosBody: tr(r.whatCanBeExpectedBody),
      modelHeading: tr(r.whatCanBeExpected),
      tableHeaders: {
        careOption: tr(r.pdf.table.careOption),
        rank: tr(r.pdf.table.rank),
        note: tr(r.pdf.table.note),
      },
      scenarioTables: [
        { heading: tr(r.scenarioTabs.single), rows: scenarioTableRows(p.scenarios) },
      ],
      predictorsHeading: tr(r.whatInfluences),
      predictorsBody: tr(r.predictorsNote),
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

        <div className="mt-6 flex items-baseline gap-3 border-b border-border pb-4">
          <span className="text-4xl font-semibold tabular-nums leading-none">{p.baseline}</span>
          <div className="text-sm">
            <p className="text-muted-foreground">
              {r.phq9Label} {tr(r.of27)}
            </p>
            <p className="font-medium">
              {tr(SEVERITY_LABEL[p.severity])} · {tr(r.range)} {SEVERITY_RANGE[p.severity]}
            </p>
          </div>
        </div>

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
                helpfulSectionLabel={tr(r.ranking.helpfulSection)}
                otherSectionLabel={tr(r.ranking.otherSection)}
                rankAriaLabel={(rank, total) => fill(tr(r.ranking.rankAria), { rank, total })}
                outcome={{
                  baseline: p.baseline,
                  todayLabel: tr(r.legend.today),
                  lowLabel: tr(r.legend.fewer),
                  highLabel: tr(r.legend.more),
                  legend: {
                    expected: tr(r.legend.expected),
                    helpful: tr(r.legend.helpful),
                    interval: tr(r.legend.interval),
                    today: tr(r.legend.today),
                    scale: tr(r.legend.scale),
                  },
                }}
              />
            </div>
          )}
        </section>

        {/* ---------------- What influences the estimate ---------------- */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{tr(r.whatInfluences)}</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {tr(r.predictorsNote)}
          </p>

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
