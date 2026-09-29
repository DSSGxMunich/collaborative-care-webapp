import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CareOptions } from "@/components/CareOptions";
import { ChartIcon, DownloadIcon } from "@/components/icons";
import { InfoTooltip } from "@/components/InfoTooltip";
import { EmptyState, PageBody, PageHero } from "@/components/PageHero";
import { fill, ui, useLang } from "@/lib/i18n";
import { SEVERITY_LABEL, SEVERITY_RANGE, type Severity } from "@/lib/phq9";
import type { Scenario } from "@/lib/model";
import { generateResultsPdf } from "@/lib/pdf";
import { usePrediction } from "@/lib/usePrediction";
import { ageFromBirthDate, SEX_OPTIONS } from "@/lib/session";
import { WaitingBlocker } from "@/components/WaitingBlocker";
import resultsContent from "@/content/results.json";

export const Route = createFileRoute("/ergebnis")({
  head: () => ({
    meta: [
      { title: "Ihre Auswertung | Versorgungskompass" },
      { name: "description", content: resultsContent.title.de },
    ],
  }),
  component: Results,
});

const r = resultsContent;

/**
 * Today's PHQ-9 score as text only: the number, then its severity band.
 * No scale here: the care-option strips below already place today's score
 * on the 0–27 scale, so a second one on top only repeated it.
 */
function CurrentScore({ score, severity }: { score: number; severity: Severity }) {
  const { tr } = useLang();
  const c = r.currentScore;

  return (
    <div className="panel mt-6 p-6">
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
    <div className="rounded-xl border border-warning/30 bg-warning-soft p-5">
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
  const { tr, lang } = useLang();
  const p = usePrediction();
  const [revealed, setRevealed] = useState(false);

  if (!p.hydrated) return <div className="mx-auto max-w-2xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <EmptyState icon={<ChartIcon className="h-6 w-6" />} title={tr(r.title)}>
        <p className="text-sm text-muted-foreground">{tr(ui.noData)}</p>
        <Link
          to="/fragebogen"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(ui.buttons.start)}
        </Link>
      </EmptyState>
    );
  }

  if (p.session.mode === "waitingRoom" && !p.session.unlocked) {
    return <WaitingBlocker />;
  }

  if (!revealed) {
    return (
      <EmptyState
        icon={<ChartIcon className="h-6 w-6" />}
        title={tr(r.thankYou.title)}
        body={tr(r.thankYou.body)}
      >
        <div className="space-y-2.5">
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
      </EmptyState>
    );
  }

  const activeScenarios = p.scenarios;

  /** Usual care keeps its own short label; a package's (or single component's) label is its active components joined together. */
  const scenarioLabel = (scenario: Scenario) =>
    scenario.id === "usualCare"
      ? tr(r.scenarios.usualCare.short)
      : scenario.components.map((id) => tr(r.components[id].short)).join(" + ");

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
        note: isUsualCare
          ? tr(r.ranking.comparisonLabel)
          : isHelpful(scenario)
            ? tr(r.legend.better)
            : "–",
        helpful: !isUsualCare && isHelpful(scenario),
      };
    });

  const downloadPdf = () => {
    generateResultsPdf({
      appName: tr(ui.appName),
      lang,
      filenamePrefix: tr({ de: "meine-auswertung", en: "my-results" }),
      title: tr(r.title),
      subtitle: tr(r.pdf.subtitle),
      baselineLabel: tr(r.currentScore.label),
      baselineValue: `${p.baseline} ${tr(r.currentScore.outOf27)}`,
      severityValue: `${tr(SEVERITY_LABEL[p.severity])} ${fill(tr(r.currentScore.range), { range: SEVERITY_RANGE[p.severity] })}`,
      scenariosHeading: tr(r.whatCanBeExpected),
      scenariosBody: tr(r.whatCanBeExpectedBody),
      tableHeaders: {
        careComponent: tr(r.pdf.table.careComponent),
        rank: tr(r.pdf.table.rank),
        note: tr(r.pdf.table.note),
      },
      scenarioTables: [
        {
          heading: tr(r.scenarioTabs.single),
          // Usual care first, as the comparison row, matching the page.
          rows: scenarioTableRows([
            ...(usualCareScenario ? [usualCareScenario] : []),
            ...rankedScenarios,
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
    <>
      <PageHero icon={<ChartIcon className="h-6 w-6" />} title={tr(r.title)}>
        <button
          type="button"
          onClick={downloadPdf}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary print:hidden"
        >
          <DownloadIcon className="h-4 w-4" />
          {tr(r.actions.downloadPdf)}
        </button>
      </PageHero>
      <PageBody>
        <DisclaimerCard />

        <CurrentScore score={p.baseline} severity={p.severity} />

        {/* ---------------- The result: ranked care components ---------------- */}
        <CareOptions baseline={p.baseline} scenarios={p.scenarios} />

        {/* ---------------- About these estimates: research basis + inputs ---------------- */}
        <section className="panel mt-6 p-6">
          <h2 className="text-lg font-semibold">{tr(r.aboutEstimates.heading)}</h2>
          {/* The three facts behind every estimate, at a glance. */}
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {r.aboutEstimates.facts.map((fact, i) => (
              <div key={i} className="border-t-2 border-primary pt-2">
                <dt className="text-2xl font-semibold text-primary">{tr(fact.value)}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {tr(fact.label)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
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

        <div className="mt-8 flex flex-wrap gap-2">
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
      </PageBody>
    </>
  );
}
