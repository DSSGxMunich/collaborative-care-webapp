import { createFileRoute, Link } from "@tanstack/react-router";
import { CareRanking } from "@/components/CareRanking";
import { fill, ui, useLang } from "@/lib/i18n";
import { PHQ9_ITEMS, SEVERITY_LABEL } from "@/lib/phq9";
import { assessRisk } from "@/lib/safety";
import { MODEL_META } from "@/lib/model";
import { generatePraxisPdf } from "@/lib/pdf";
import { usePrediction } from "@/lib/usePrediction";
import {
  ageFromBirthDate,
  PRIOR_TREATMENTS,
  PROBABILITY_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/session";
import { chunk } from "@/lib/utils";
import { GpUnlockCard } from "@/components/GpUnlockCard";
import { DownloadIcon, StethoscopeIcon } from "@/components/icons";
import { EmptyState, PageBody, PageHero } from "@/components/PageHero";
import praxisContent from "@/content/praxis.json";
import resultsContent from "@/content/results.json";

export const Route = createFileRoute("/praxis")({
  head: () => ({
    meta: [
      { title: "Kurzbefund für die Praxis – Versorgungskompass" },
      { name: "description", content: praxisContent.subtitle.de },
    ],
  }),
  component: Clinician,
});

const c = praxisContent;
const r = resultsContent;

function Clinician() {
  const { tr } = useLang();
  const p = usePrediction();

  if (!p.hydrated) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <EmptyState
        icon={<StethoscopeIcon className="h-6 w-6" />}
        title={tr(ui.nav.clinician)}
        body={tr(ui.noData)}
      >
        <Link
          to="/fragebogen"
          className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(ui.buttons.start)}
        </Link>
      </EmptyState>
    );
  }

  // Waiting-room answers stay locked until the GP enters the patient's code
  // here — this page ("For the practice") is where that code is entered.
  if (p.session.mode === "waitingRoom" && !p.session.unlocked) {
    return (
      <>
        <PageHero
          icon={<StethoscopeIcon className="h-6 w-6" />}
          title={tr(c.title)}
          intro={tr(c.subtitle)}
        />
        <PageBody>
          <GpUnlockCard />
        </PageBody>
      </>
    );
  }

  const { profile, safety } = p.session;
  const risk = assessRisk(p.session);
  const yesNo = (v: "yes" | "no" | null) => (v ? tr(v === "yes" ? ui.yes : ui.no) : "–");

  /** Badge tone per RiskLevel — "minimal" gets no badge (plain row, like everything else). */
  const RISK_TONE: Record<typeof risk, "warning" | "destructive" | undefined> = {
    minimal: undefined,
    lower: "warning",
    higher: "destructive",
  };

  const rows: { label: string; value: string; tone?: "warning" | "destructive" | undefined }[] = [
    { label: tr(c.rows.riskAssessment), value: tr(c.riskFlag[risk]), tone: RISK_TONE[risk] },
    { label: tr(c.rows.phq9Total), value: `${p.baseline}/27` },
    { label: tr(c.rows.severity), value: tr(SEVERITY_LABEL[p.severity]) },
    { label: tr(c.rows.suicidality), value: `${p.session.phq[8] ?? 0}/3` },
    { label: tr(c.rows.past), value: yesNo(safety.past) },
    { label: tr(c.rows.plan), value: yesNo(safety.plan) },
    {
      label: tr(c.rows.probability),
      value:
        safety.probability !== null
          ? tr(
              PROBABILITY_OPTIONS.find((o) => o.value === safety.probability)?.label ?? {
                de: "–",
                en: "–",
              },
            )
          : "–",
    },
    { label: tr(c.rows.preventive), value: yesNo(safety.preventive) },
    {
      label: tr(c.rows.familyHistory),
      value: yesNo(safety.familyHistory),
      tone: safety.familyHistory === "yes" ? "warning" : undefined,
    },
    {
      label: tr(c.rows.age),
      value: profile.birthDate ? ageFromBirthDate(profile.birthDate).toFixed(2) : "–",
    },
    {
      label: tr(c.rows.sex),
      value: profile.sex
        ? tr(SEX_OPTIONS.find((o) => o.value === profile.sex)?.label ?? { de: "–", en: "–" })
        : "–",
    },
    { label: tr(c.rows.priorEpisode), value: yesNo(profile.priorEpisode) },
    {
      label: tr(c.rows.priorTreatment),
      value:
        profile.priorTreatment
          .map((id) => tr(PRIOR_TREATMENTS.find((t) => t.id === id)?.label ?? { de: "–", en: "–" }))
          .join(", ") || "–",
    },
    {
      label: tr(c.rows.riskScore),
      value: p.predictors.find((row) => row.id === "riskScore")?.value ?? "–",
    },
  ];

  /** Usual care keeps its own label; a package's label is its active components joined together. */
  const careComponentLabel = (scenario: (typeof p.scenarios)[number]) =>
    scenario.id === "usualCare"
      ? tr(r.scenarios.usualCare.label)
      : scenario.components.map((id) => tr(r.components[id].short)).join(" + ");

  /** Same components as careComponentLabel, grouped at most 2 per line so a 3-4 component package doesn't run on into one long string in the table cell. */
  const careComponentLabelLines = (scenario: (typeof p.scenarios)[number]): string[] =>
    scenario.id === "usualCare"
      ? [tr(r.scenarios.usualCare.label)]
      : chunk(
          scenario.components.map((id) => tr(r.components[id].short)),
          2,
        ).map((group) => group.join(" + "));

  /** Every row is a single component added alone, so it always has one unambiguous explanation to show. */
  const careComponentDescription = (scenario: (typeof p.scenarios)[number]): string | undefined => {
    const [id] = scenario.components;
    return id !== undefined && scenario.components.length === 1
      ? tr(r.components[id].description)
      : undefined;
  };

  /** A component is flagged "likely to help" when its expected outcome beats the patient's own baseline — no magnitude shown, just the direction. */
  const isHelpful = (scenario: (typeof p.scenarios)[number]) =>
    scenario.expectedEndpoint < p.baseline;

  const rankedScenarios = p.scenarios.filter((s) => s.id !== "usualCare");
  const usualCareScenario = p.scenarios.find((s) => s.id === "usualCare");

  /** e.g. "9.2 (7.1–11.4)": expected 12-month PHQ-9 and its 95% credible interval. */
  const formatEndpoint = (scenario: (typeof p.scenarios)[number]) => {
    const f = (x: number) => x.toFixed(1);
    return `${f(scenario.expectedEndpoint)} (${f(scenario.endpointRange[0])}–${f(scenario.endpointRange[1])})`;
  };

  const scenarioTableRows = (scenarios: typeof p.scenarios) =>
    scenarios.map((scenario) => {
      const isUsualCare = scenario.id === "usualCare";
      const rank = isUsualCare ? "–" : String(rankedScenarios.indexOf(scenario) + 1);
      return {
        label: careComponentLabel(scenario),
        description: isUsualCare
          ? `${tr(r.scenarios.usualCare.description)} ${tr(r.scenarios.usualCare.note)}`
          : careComponentDescription(scenario),
        rank,
        endpoint: formatEndpoint(scenario),
        note: !isUsualCare && isHelpful(scenario) ? tr(c.table.better) : "–",
      };
    });

  const downloadPdf = () => {
    const [riskRow, ...restRows] = rows;
    generatePraxisPdf({
      filenamePrefix: tr({ de: "kurzbefund-praxis", en: "clinical-summary" }),
      title: tr(c.title),
      subtitle: tr(c.subtitle),
      riskLabel: riskRow?.label ?? "",
      riskValue: riskRow?.value ?? "",
      riskTone: riskRow?.tone,
      summaryHeading: tr(c.summary),
      rows: restRows,
      phq9Heading: tr(c.phq9ItemProfile),
      phq9Items: PHQ9_ITEMS.map((item, i) => ({
        index: i + 1,
        label: tr(item),
        value: p.session.phq[i] ?? 0,
      })),
      modelHeading: tr(c.modelEstimates),
      tableHeaders: {
        careComponent: tr(c.table.careComponent),
        rank: tr(c.table.rank),
        endpoint: tr(c.table.endpoint),
        note: tr(c.table.note),
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
      footer: fill(tr(c.footer), { version: MODEL_META.version }),
    });
  };

  return (
    <>
      <PageHero
        icon={<StethoscopeIcon className="h-6 w-6" />}
        title={tr(c.title)}
        intro={tr(c.subtitle)}
      >
        <button
          type="button"
          onClick={downloadPdf}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary print:hidden"
        >
          <DownloadIcon className="h-4 w-4" />
          {tr(c.print)}
        </button>
      </PageHero>
      <PageBody>
        <section className="grid gap-6 md:grid-cols-2">
          <div className="panel p-6">
            <h2 className="text-base font-semibold">{tr(c.summary)}</h2>
            <dl className="mt-3 divide-y divide-border text-sm">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-right">
                    {row.tone ? (
                      <span
                        className={[
                          "rounded-md border px-2 py-0.5 text-xs font-semibold",
                          row.tone === "destructive"
                            ? "border-destructive/40 bg-destructive-soft text-destructive"
                            : "border-warning/40 bg-warning-soft text-warning",
                        ].join(" ")}
                      >
                        {row.value}
                      </span>
                    ) : (
                      <span className="font-medium">{row.value}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="panel p-6">
            <h2 className="text-base font-semibold">{tr(c.phq9ItemProfile)}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {PHQ9_ITEMS.map((item, i) => {
                const v = p.session.phq[i] ?? 0;
                // Item 9 (suicidality) is drawn in red so it stands out.
                const filled = i === 8 ? "bg-destructive" : "bg-primary";
                return (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate" title={tr(item)}>
                      {tr(item)}
                    </span>
                    <span className="flex gap-0.5" aria-label={`${v}/3`}>
                      {[0, 1, 2].map((step) => (
                        <span
                          key={step}
                          aria-hidden
                          className={[
                            "h-4 w-2 rounded-sm",
                            step < v ? filled : "bg-secondary",
                          ].join(" ")}
                        />
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="panel mt-6 p-6">
          <h2 className="text-base font-semibold">{tr(c.modelEstimates)}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {tr(c.modelEstimatesIntro)}
          </p>

          {usualCareScenario && (
            <div className="mt-4">
              <CareRanking
                compact
                usualCare={usualCareScenario}
                ranked={rankedScenarios}
                labelLines={careComponentLabelLines}
                description={careComponentDescription}
                helpful={isHelpful}
                usualCareDescription={tr(r.scenarios.usualCare.description)}
                usualCareNote={tr(r.scenarios.usualCare.note)}
                helpfulSectionLabel={tr(c.ranking.helpfulSection)}
                otherSectionLabel={tr(c.ranking.otherSection)}
                rankAriaLabel={(rank, total) => fill(tr(c.ranking.rankAria), { rank, total })}
                outcome={{
                  baseline: p.baseline,
                  todayLabel: fill(tr(c.outcome.today), { baseline: p.baseline }),
                  lowLabel: tr(c.outcome.fewer),
                  highLabel: tr(c.outcome.more),
                  ticks: [0, 5, 10, 15, 20, 27],
                  legend: {
                    expected: tr(c.outcome.expected),
                    helpful: tr(c.outcome.helpful),
                    interval: tr(c.outcome.interval),
                    today: tr(c.outcome.todayLine),
                    scale: tr(c.outcome.scale),
                  },
                  formatValue: formatEndpoint,
                  expectedLabel: (s) =>
                    fill(tr(c.outcome.expectedHover), { value: formatEndpoint(s) }),
                }}
              />
            </div>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {fill(tr(c.footer), { version: MODEL_META.version })}
          </p>
        </section>
      </PageBody>
    </>
  );
}
