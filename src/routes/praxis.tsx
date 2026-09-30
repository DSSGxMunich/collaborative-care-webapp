import { createFileRoute, Link } from "@tanstack/react-router";
import { CareOptions } from "@/components/CareOptions";
import { fill, ui, useLang } from "@/lib/i18n";
import { PHQ9_ITEMS, SEVERITY_LABEL } from "@/lib/phq9";
import { assessRisk } from "@/lib/safety";
import { MODEL_META } from "@/lib/model";
import { generatePraxisPdf } from "@/lib/pdf";
import { usePrediction } from "@/lib/usePrediction";
import { ageFromBirthDate, TREATMENTS, SEX_OPTIONS } from "@/lib/session";
import { GpUnlockCard } from "@/components/GpUnlockCard";
import { DownloadIcon, StethoscopeIcon } from "@/components/icons";
import { PageBody, PageHero } from "@/components/PageHero";
import praxisContent from "@/content/praxis.json";
import resultsContent from "@/content/results.json";

export const Route = createFileRoute("/praxis")({
  head: () => ({
    meta: [
      { title: "Praxis-Kurzbefund | Versorgungskompass" },
      { name: "description", content: praxisContent.subtitle.de },
    ],
  }),
  component: Clinician,
});

const c = praxisContent;
const r = resultsContent;

function Clinician() {
  const { tr, lang } = useLang();
  const p = usePrediction();

  if (!p.hydrated) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  // No answers on this device (typically the GP's own computer), or
  // waiting-room answers still locked: this page ("Practice") is where the
  // patient's code is entered. The code carries the answers, so it works here
  // whether or not the patient filled in the questionnaire on this device.
  if (!p.complete || (p.session.mode === "waitingRoom" && !p.session.unlocked)) {
    return (
      <>
        <PageHero
          icon={<StethoscopeIcon className="h-6 w-6" />}
          title={tr(c.title)}
          intro={tr(c.subtitle)}
        />
        <PageBody>
          <GpUnlockCard />
          {!p.complete && (
            <p className="mt-4 text-sm text-muted-foreground">
              {tr(c.unlock.noCode)}{" "}
              <Link
                to="/fragebogen"
                className="font-medium text-primary underline underline-offset-2"
              >
                {tr(ui.buttons.start)}
              </Link>
            </p>
          )}
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
    // A "minimal" P4 flag already implies every answer, so only a raised flag gets a reason row,
    // listing just the answers that raised it (same order as riskReasons in safety.ts).
    ...(risk === "minimal"
      ? []
      : [
          {
            label: tr(c.rows.reason),
            value: [
              safety.probability === 2 && c.reasons.probabilityVery,
              safety.probability === 1 && c.reasons.probabilitySomewhat,
              safety.preventive === "no" && c.reasons.noPreventive,
              safety.plan === "yes" && c.reasons.plan,
              safety.past === "yes" && c.reasons.past,
            ]
              .filter((reason) => reason !== false)
              .map(tr)
              // One reason per line: a single long line wraps mid-word in the narrow value column.
              .join("\n"),
          },
        ]),
    // Family history is an extra risk factor outside P4: only worth a line when present.
    ...(safety.familyHistory === "yes"
      ? [{ label: tr(c.rows.familyHistory), value: tr(ui.yes), tone: "warning" as const }]
      : []),
    // Total and severity band read as one fact; item 9 is already highlighted in the item profile.
    { label: tr(c.rows.phq9Total), value: `${p.baseline}/27 · ${tr(SEVERITY_LABEL[p.severity])}` },
    {
      label: tr(c.rows.ageSex),
      value: [
        profile.birthDate ? Math.floor(ageFromBirthDate(profile.birthDate)).toString() : "–",
        profile.sex
          ? tr(SEX_OPTIONS.find((o) => o.value === profile.sex)?.label ?? { de: "–", en: "–" })
          : "–",
      ].join(" · "),
    },
    // Now and before as separate rows: an ongoing treatment and an earlier one call for
    // different next steps.
    ...(["current", "past"] as const).map((when) => ({
      label: tr(when === "current" ? c.rows.currentTreatment : c.rows.pastTreatment),
      value:
        profile.treatment[when]
          .map((id) => tr(TREATMENTS.find((t) => t.id === id)?.label ?? { de: "–", en: "–" }))
          .join(", ") || tr(c.noTreatment),
    })),
  ];

  /** Usual care keeps its own label; a package's label is its active components joined together. */
  const careComponentLabel = (scenario: (typeof p.scenarios)[number]) =>
    scenario.id === "usualCare"
      ? tr(r.scenarios.usualCare.label)
      : scenario.components.map((id) => tr(r.components[id].short)).join(" + ");

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

  const scenarioTableRows = (scenarios: typeof p.scenarios) =>
    scenarios.map((scenario) => {
      const isUsualCare = scenario.id === "usualCare";
      const rank = isUsualCare ? "–" : String(rankedScenarios.indexOf(scenario) + 1);
      return {
        label: careComponentLabel(scenario),
        description: isUsualCare
          ? tr(r.scenarios.usualCare.description)
          : careComponentDescription(scenario),
        rank,
        note: !isUsualCare && isHelpful(scenario) ? tr(c.table.better) : "–",
        helpful: !isUsualCare && isHelpful(scenario),
      };
    });

  const downloadPdf = () => {
    const [riskRow, ...restRows] = rows;
    generatePraxisPdf({
      appName: tr(ui.appName),
      lang,
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
        note: tr(c.table.note),
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
                  <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                  <dd className="text-right">
                    {row.tone ? (
                      <span
                        className={[
                          "inline-block rounded-md border px-2 py-0.5 text-left text-xs font-semibold leading-snug",
                          row.tone === "destructive"
                            ? "border-destructive/40 bg-destructive-soft text-destructive"
                            : "border-warning/40 bg-warning-soft text-warning",
                        ].join(" ")}
                      >
                        {row.value}
                      </span>
                    ) : (
                      <span className="whitespace-pre-line font-medium">{row.value}</span>
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

        <CareOptions baseline={p.baseline} scenarios={p.scenarios} />

        {/* The next patient's code can be entered straight from here. */}
        <section className="mt-10 print:hidden">
          <GpUnlockCard />
        </section>
      </PageBody>
    </>
  );
}
