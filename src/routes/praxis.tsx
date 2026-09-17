import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { effectiveGad7Score } from "@/lib/gad7";
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
import praxisContent from "@/content/praxis.json";
import resultsContent from "@/content/results.json";

export const Route = createFileRoute("/praxis")({
  head: () => ({
    meta: [
      { title: "Kurzbefund für die Praxis – Depressions-Kompass" },
      { name: "description", content: praxisContent.subtitle.de },
    ],
  }),
  component: Clinician,
});

const c = praxisContent;
const r = resultsContent;

type ScenarioTab = "single" | "combo";

function Clinician() {
  const { tr } = useLang();
  const p = usePrediction();
  const [tab, setTab] = useState<ScenarioTab>("single");

  if (!p.hydrated) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">{tr(ui.nav.clinician)}</h1>
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
      label: tr(c.rows.gad7),
      value: (() => {
        const score = effectiveGad7Score(profile);
        return score !== null ? `${score}/21` : tr(c.rows.gad7Assumed);
      })(),
    },
    {
      label: tr(c.rows.riskScore),
      value: p.predictors.find((row) => row.id === "riskScore")?.value ?? "–",
    },
  ];

  const round1 = (x: number) => Number(x.toFixed(1));
  const usualEndpoint =
    p.scenarios.find((s) => s.id === "usualCare")?.expectedEndpoint ?? p.baseline;

  /** Usual care keeps its own label; a package's label is its active components joined together. */
  const careOptionLabel = (scenario: (typeof p.scenarios)[number]) =>
    scenario.id === "usualCare"
      ? tr(r.scenarios.usualCare.label)
      : scenario.components.map((id) => tr(r.components[id].short)).join(" + ");

  const scenarioTableRows = (scenarios: typeof p.scenarios) =>
    scenarios.map((scenario) => {
      const delta = round1(usualEndpoint - scenario.expectedEndpoint);
      return {
        label: careOptionLabel(scenario),
        endpoint: String(scenario.expectedEndpoint),
        range: `${scenario.endpointRange[0]}–${scenario.endpointRange[1]}`,
        delta: scenario.id === "usualCare" ? "–" : delta > 0 ? `-${delta}` : `+${-delta}`,
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
        careOption: tr(c.table.careOption),
        endpoint: tr(c.table.endpoint),
        delta: tr(c.table.delta),
      },
      scenarioTables: [
        { heading: tr(r.scenarioTabs.single), rows: scenarioTableRows(p.singleScenarios) },
        { heading: tr(r.scenarioTabs.combo), rows: scenarioTableRows(p.scenarios) },
      ],
      footer: fill(tr(c.footer), { version: MODEL_META.version }),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{tr(c.title)}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{tr(c.subtitle)}</p>
        </div>
        <button
          type="button"
          onClick={downloadPdf}
          className="rounded-md border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary print:hidden"
        >
          {tr(c.print)}
        </button>
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
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

        <div>
          <h2 className="text-base font-semibold">{tr(c.phq9ItemProfile)}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {PHQ9_ITEMS.map((item, i) => {
              const v = p.session.phq[i] ?? 0;
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
                          step < v ? (i === 8 ? "bg-destructive" : "bg-primary") : "bg-secondary",
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

      <section className="mt-8">
        <h2 className="text-base font-semibold">{tr(c.modelEstimates)}</h2>

        <div className="mt-3 inline-flex rounded-md border border-border p-0.5 text-sm print:hidden">
          {(["single", "combo"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={[
                "rounded-[5px] px-3 py-1.5 font-medium transition-colors",
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tr(r.scenarioTabs[t])}
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">{tr(c.table.careOption)}</th>
                <th className="px-4 py-2.5 font-medium">{tr(c.table.endpoint)}</th>
                <th className="px-4 py-2.5 font-medium">{tr(c.table.delta)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(tab === "single" ? p.singleScenarios : p.scenarios).map((scenario) => {
                const delta = round1(usualEndpoint - scenario.expectedEndpoint);
                return (
                  <tr key={scenario.id}>
                    <td className="px-4 py-2.5 font-medium">{careOptionLabel(scenario)}</td>
                    <td className="px-4 py-2.5">
                      {scenario.expectedEndpoint}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({scenario.endpointRange[0]}–{scenario.endpointRange[1]})
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {scenario.id === "usualCare" ? (
                        <span className="text-muted-foreground">–</span>
                      ) : delta === 0 ? (
                        <span className="text-muted-foreground">±0</span>
                      ) : delta > 0 ? (
                        <span className="font-medium text-success">
                          -{delta}
                          <span className="sr-only"> ({tr(c.table.better)})</span>
                        </span>
                      ) : (
                        <span className="font-medium text-warning">
                          +{-delta}
                          <span className="sr-only"> ({tr(c.table.worse)})</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/*
          Lower PHQ-9 is better, so a negative delta (e.g. -0.5) is the good
          outcome — color-coded the same green/amber as the results chart
          (never red: clinicians print this for patients too) so it isn't
          misread as the sign alone would suggest.
        */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success" />
            {tr(c.table.better)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-warning" />
            {tr(c.table.worse)}
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {fill(tr(c.footer), { version: MODEL_META.version })}
        </p>
      </section>
    </div>
  );
}
