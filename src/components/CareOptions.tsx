import { CareRanking } from "@/components/CareRanking";
import { fill, useLang } from "@/lib/i18n";
import type { Scenario } from "@/lib/model";
import resultsContent from "@/content/results.json";

const r = resultsContent;

/**
 * The "estimated symptom scores with different care options" section,
 * shared verbatim by the patient results page (/ergebnis) and the practice
 * report (/praxis): GP and patient look at it together, so both must see
 * the same heading, wording, ranking and study examples. All copy comes
 * from results.json.
 */
export function CareOptions({ baseline, scenarios }: { baseline: number; scenarios: Scenario[] }) {
  const { tr } = useLang();
  const usualCare = scenarios.find((s) => s.id === "usualCare");
  const ranked = scenarios.filter((s) => s.id !== "usualCare");

  const labelLines = (scenario: Scenario): string[] =>
    scenario.id === "usualCare"
      ? [tr(r.scenarios.usualCare.short)]
      : scenario.components.map((id) => tr(r.components[id].short));

  const description = (scenario: Scenario): string | undefined => {
    const [id] = scenario.components;
    return id !== undefined ? tr(r.components[id].description) : undefined;
  };

  return (
    <section className="panel mt-6 p-6">
      <h2 className="text-lg font-semibold">{tr(r.whatCanBeExpected)}</h2>

      {usualCare && (
        <div className="mt-5">
          <CareRanking
            usualCare={usualCare}
            ranked={ranked}
            labelLines={labelLines}
            description={description}
            helpful={(scenario) => scenario.expectedEndpoint < baseline}
            usualCareDescription={tr(r.scenarios.usualCare.description)}
            usualCareNote={tr(r.scenarios.usualCare.note)}
            helpfulSectionLabel={tr(r.ranking.helpfulSection)}
            otherSectionLabel={tr(r.ranking.otherSection)}
            comparisonLabel={tr(r.ranking.comparisonLabel)}
            rankAriaLabel={(rank, total) => fill(tr(r.ranking.rankAria), { rank, total })}
            example={(scenario) => {
              const [id] = scenario.components;
              if (id === undefined) return null;
              const study = r.components[id].example;
              return (
                <div className="mt-2.5">
                  <p className="text-xs font-semibold">{tr(r.ranking.exampleHeading)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {tr(study.text)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{tr(study.source)}</p>
                </div>
              );
            }}
            outcome={{
              baseline,
              todayLabel: tr(r.legend.today),
              expectedLabel: () => tr(r.legend.expected),
              lowLabel: tr(r.legend.fewer),
              highLabel: tr(r.legend.more),
              legend: {
                expected: tr(r.legend.expected),
                interval: tr(r.legend.interval),
                today: tr(r.legend.today),
              },
            }}
          />
        </div>
      )}
    </section>
  );
}
