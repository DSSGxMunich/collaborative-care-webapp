import { Link } from "@tanstack/react-router";
import { ExamplePopover } from "@/components/ExamplePopover";
import { OutcomeChart } from "@/components/OutcomeChart";
import { useLang } from "@/lib/i18n";
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
 * component means, with a study example. Keeping the explanations out of the
 * chart keeps the chart short enough to compare at a glance.
 */
export function CareOptions({ baseline, scenarios }: { baseline: number; scenarios: Scenario[] }) {
  const { tr } = useLang();
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
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {tr(r.ranking.combinedNote)}{" "}
          <Link
            to="/methodology"
            hash="singleComponents"
            className="font-medium text-foreground underline underline-offset-2"
          >
            {tr(r.ranking.combinedNoteLink)}
          </Link>
        </p>

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
        <h2 className="text-lg font-semibold">{tr(r.componentGuide.heading)}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {tr(r.componentGuide.body)}
        </p>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          <div className="py-3.5">
            <dt className="text-sm font-medium">{label(usualCare)}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {tr(r.scenarios.usualCare.description)}
            </dd>
            <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {tr(r.scenarios.usualCare.note)}
            </dd>
          </div>
          {ranked.map((scenario) => {
            const [id] = scenario.components;
            if (id === undefined) return null;
            const component = r.components[id];
            return (
              <div key={scenario.id} className="py-3.5">
                <dt className="text-sm font-medium">{label(scenario)}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {tr(component.description)}
                </dd>
                <dd className="mt-2">
                  <ExamplePopover
                    buttonLabel={tr(r.ranking.example.button)}
                    text={tr(component.example.text)}
                    source={tr(component.example.source)}
                    closeLabel={tr(r.ranking.example.close)}
                  />
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </>
  );
}
