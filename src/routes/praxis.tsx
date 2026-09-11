import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { fill, ui, useLang } from "@/lib/i18n";
import { PHQ9_ITEMS, SEVERITY_LABEL } from "@/lib/phq9";
import { assessRisk } from "@/lib/safety";
import { MODEL_META } from "@/lib/model";
import { usePrediction } from "@/lib/usePrediction";
import { ageFromBirthDate, PRIOR_TREATMENTS, SEX_OPTIONS } from "@/lib/session";
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

  const rows: { label: string; value: string }[] = [
    { label: tr(c.rows.phq9Total), value: `${p.baseline}/27` },
    { label: tr(c.rows.severity), value: tr(SEVERITY_LABEL[p.severity]) },
    { label: tr(c.rows.suicidality), value: `${p.session.phq[8] ?? 0}/3` },
    { label: tr(c.rows.riskAssessment), value: tr(c.riskFlag[risk]) },
    { label: tr(c.rows.planPrep), value: yesNo(safety.plan) },
    { label: tr(c.rows.canStaySafe), value: yesNo(safety.canStaySafe) },
    { label: tr(c.rows.pastAttempt), value: yesNo(safety.pastAttempt) },
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
      value:
        profile.gad7Known === "yes" && profile.gad7Score !== null
          ? `${profile.gad7Score}/21`
          : `${tr(c.rows.gad7Assumed)}`,
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{tr(c.title)}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{tr(c.subtitle)}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary"
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
                <dd className="text-right font-medium">{row.value}</dd>
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

        <div className="mt-3 inline-flex rounded-md border border-border p-0.5 text-sm">
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
                      {scenario.id === "usualCare" ? "–" : delta > 0 ? `-${delta}` : `+${-delta}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {fill(tr(c.footer), { version: MODEL_META.version })}
        </p>
      </section>
    </div>
  );
}
