import { useState } from "react";
import { Toggle } from "@/components/fields";
import { OutcomeChart } from "@/components/OutcomeChart";
import { fill, useLang } from "@/lib/i18n";
import { beatsUsualCare, type Scenario } from "@/lib/model";
import { SEVERITY_LABEL, type Severity } from "@/lib/phq9";
import resultsContent from "@/content/results.json";

const r = resultsContent;

const SEVERITIES: Severity[] = ["minimal", "mild", "moderate", "moderatelySevere", "severe"];
const bySeverity = (f: (s: Severity) => string) =>
  Object.fromEntries(SEVERITIES.map((s) => [s, f(s)])) as Record<Severity, string>;

/**
 * The care-options sections, shared verbatim by the patient results page
 * (/ergebnis) and the practice report (/praxis): GP and patient look at them
 * together, so both must see the same heading, wording, chart and study
 * examples. All copy comes from results.json; the details live on the
 * Methodology page, linked rather than repeated here.
 *
 * Two parts: first all options on one chart (OutcomeChart), then what each
 * component means, numbered in the chart's order. One switch in that
 * list's header shows every component's study example inline at once,
 * rather than repeating a button on each of the 10 rows.
 * Usual care is left out of that list: the chart already shows it as the
 * reference row. Keeping the explanations out of the
 * chart keeps the chart short enough to compare at a glance.
 */
export function CareOptions({ baseline, scenarios }: { baseline: number; scenarios: Scenario[] }) {
  const { tr } = useLang();
  const [showExamples, setShowExamples] = useState(false);
  const usualCare = scenarios.find((s) => s.id === "usualCare");
  const ranked = scenarios.filter((s) => s.id !== "usualCare");

  const label = (scenario: Scenario): string =>
    scenario.id === "usualCare"
      ? tr(r.scenarios.usualCare.short)
      : scenario.components.map((id) => tr(r.components[id].short)).join(" + ");

  if (!usualCare) return null;

  return (
    <>
      <section className="panel mt-6 p-6">
        <h2 className="text-lg font-semibold">{tr(r.whatCanBeExpected)}</h2>

        <div className="mt-5">
          <OutcomeChart
            usualCare={usualCare}
            scenarios={ranked}
            baseline={baseline}
            label={label}
            helpful={beatsUsualCare(scenarios, baseline)}
            labels={{
              bands: bySeverity((s) => tr(r.chart.bands[s])),
              severity: bySeverity((s) => tr(SEVERITY_LABEL[s])),
              mostLikely: tr(r.chart.mostLikely),
              today: tr(r.chart.today),
              fewer: tr(r.legend.fewer),
              more: tr(r.legend.more),
              axis: tr(r.chart.axis),
              legend: {
                helpful: tr(r.legend.better),
                other: tr(r.chart.legend.other),
                usualCare: tr(r.chart.legend.usualCare),
                range: tr(r.chart.legend.range),
                today: tr(r.legend.today),
              },
            }}
          />
        </div>
      </section>

      <section className="panel mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <h2 className="text-lg font-semibold">{tr(r.componentGuide.heading)}</h2>
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <span aria-hidden>{tr(r.componentGuide.showExamples)}</span>
            <Toggle
              checked={showExamples}
              onChange={setShowExamples}
              label={r.componentGuide.showExamples}
            />
          </div>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {tr(r.componentGuide.body)}
        </p>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          {ranked.map((scenario, index) => {
            const [id] = scenario.components;
            if (id === undefined) return null;
            const component = r.components[id];
            const rank = index + 1;
            return (
              <div key={scenario.id} className="flex gap-3 py-3.5">
                <span
                  aria-hidden
                  className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold tabular-nums"
                >
                  {rank}
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-sm font-medium">
                    <span className="sr-only">
                      {fill(tr(r.componentGuide.rankAria), { rank, total: ranked.length })}
                    </span>
                    {label(scenario)}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {tr(component.description)}
                  </dd>
                  {showExamples ? (
                    <dd className="mt-2.5 border-l-2 border-primary/40 pl-3 text-sm leading-relaxed">
                      {tr(component.example.text)}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {tr(component.example.source)}
                      </span>
                    </dd>
                  ) : null}
                </div>
              </div>
            );
          })}
        </dl>
      </section>
    </>
  );
}
