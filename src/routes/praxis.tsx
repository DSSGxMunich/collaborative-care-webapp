import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, ui, type L } from "@/lib/i18n";
import { PHQ9_ITEMS, SEVERITY_LABEL } from "@/lib/phq9";
import { assessRisk } from "@/lib/safety";
import { DATA_SUPPORT_LABEL, MODEL_META, PROTOTYPE_NOTE } from "@/lib/model";
import { usePrediction } from "@/lib/usePrediction";
import { CONSTRAINTS, PREFERENCES, PRIOR_TREATMENTS } from "@/lib/session";

export const Route = createFileRoute("/praxis")({
  head: () => ({
    meta: [
      { title: "Kurzbefund für die Praxis – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Aggregierte Übersicht für Hausärztinnen, Hausärzte und psychosoziale Fachkräfte: PHQ-9-Itemprofil, Risikoflag, Prädiktoren und geschätzte Effekte der Versorgungsbausteine.",
      },
      { property: "og:title", content: "Kurzbefund für die Praxis" },
      {
        property: "og:description",
        content:
          "Ein Blick statt Nachfragen: Symptomprofil, Risiko, Prädiktoren und Modellschätzungen.",
      },
    ],
  }),
  component: Clinician,
});

const YES_NO: Record<string, L> = {
  yes: ["ja", "yes"],
  no: ["nein", "no"],
};

const DURATION_LABEL: Record<string, L> = {
  lt3m: ["< 3 Monate", "< 3 months"],
  "3to12m": ["3–12 Monate", "3–12 months"],
  gt12m: ["> 12 Monate", "> 12 months"],
};

function Clinician() {
  const { tr } = useLang();
  const p = usePrediction();

  if (!p.hydrated) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="surface-card p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">{tr(ui.clinician)}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{tr(ui.noData)}</p>
          <Link
            to="/fragebogen"
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            {tr(ui.start)}
          </Link>
        </div>
      </div>
    );
  }

  const { profile, safety } = p.session;
  const risk = assessRisk(p.session);
  const riskFlag: Record<string, L> = {
    none: ["kein Hinweis", "no indication"],
    low: ["Item 9 positiv (einzelne Tage)", "item 9 positive (several days)"],
    elevated: ["erhöht – zeitnahe Abklärung", "elevated — timely review"],
    acute: ["AKUT – sofortiges Handeln", "ACUTE — act immediately"],
  };

  const rows: { label: L; value: string }[] = [
    { label: ["PHQ-9 Summenwert", "PHQ-9 total"], value: `${p.baseline}/27` },
    { label: ["Schweregrad", "Severity"], value: tr(SEVERITY_LABEL[p.severity]) },
    {
      label: ["Funktionsbeeinträchtigung", "Functional impairment"],
      value: `${p.session.functioning ?? "–"}/3`,
    },
    {
      label: ["Suizidalität (Item 9)", "Suicidality (item 9)"],
      value: `${p.session.phq[8] ?? 0}/3`,
    },
    {
      label: ["Risikoeinschätzung", "Risk assessment"],
      value: tr(riskFlag[risk] ?? riskFlag["none"]!),
    },
    {
      label: ["Konkreter Plan / Vorbereitung", "Concrete plan / preparation"],
      value: safety.plan ? tr(YES_NO[safety.plan]!) : "–",
    },
    {
      label: ["Kann sich bis zum Kontakt schützen", "Able to stay safe until contact"],
      value: safety.canStaySafe ? tr(YES_NO[safety.canStaySafe]!) : "–",
    },
    {
      label: ["Selbstverletzung/Versuch < 12 Monate", "Self-harm/attempt < 12 months"],
      value: safety.pastAttempt ? tr(YES_NO[safety.pastAttempt]!) : "–",
    },
    { label: ["Alter", "Age"], value: profile.ageBand ?? "–" },
    {
      label: ["Episodendauer", "Episode duration"],
      value: profile.duration ? tr(DURATION_LABEL[profile.duration]!) : "–",
    },
    {
      label: ["Frühere Episoden", "Previous episodes"],
      value: profile.priorEpisodes ? tr(YES_NO[profile.priorEpisodes]!) : "–",
    },
    {
      label: ["Vorbehandlungen", "Previous treatments"],
      value:
        profile.priorTreatment
          .map((id) => tr(PRIOR_TREATMENTS.find((t) => t.id === id)?.label ?? (["–", "–"] as L)))
          .join(", ") || "–",
    },
    {
      label: ["Somatische Komorbidität", "Somatic comorbidity"],
      value: profile.chronicIllness ? tr(YES_NO[profile.chronicIllness]!) : "–",
    },
    {
      label: ["Lebt allein / geringe Unterstützung", "Lives alone / low support"],
      value: `${profile.livingAlone ? tr(YES_NO[profile.livingAlone]!) : "–"} / ${
        profile.lowSupport ? tr(YES_NO[profile.lowSupport]!) : "–"
      }`,
    },
    {
      label: [
        "Psychosoziale Belastung (Arbeit/Geld/Wohnen)",
        "Psychosocial strain (work/money/housing)",
      ],
      value: profile.workStrain ? tr(YES_NO[profile.workStrain]!) : "–",
    },
    {
      label: ["Riskanter Substanzkonsum", "Risky substance use"],
      value: profile.substanceUse ? tr(YES_NO[profile.substanceUse]!) : "–",
    },
    {
      label: ["Mobilität eingeschränkt", "Mobility limited"],
      value: profile.mobilityLimited ? tr(YES_NO[profile.mobilityLimited]!) : "–",
    },
    {
      label: ["Körperliche Inaktivität", "Physical inactivity"],
      value: profile.lowActivity ? tr(YES_NO[profile.lowActivity]!) : "–",
    },
    {
      label: ["Pflege-/Sorgeverantwortung", "Caring responsibilities"],
      value: profile.caregiving ? tr(YES_NO[profile.caregiving]!) : "–",
    },
    {
      label: ["Praktische Einschränkungen", "Practical constraints"],
      value:
        profile.constraints
          .map((id) => tr(CONSTRAINTS.find((t) => t.id === id)?.label ?? (["–", "–"] as L)))
          .join(", ") || "–",
    },
    {
      label: ["Patientenpräferenzen (nicht im Modell)", "Patient preferences (not in the model)"],
      value:
        profile.preferences
          .map((id) => tr(PREFERENCES.find((t) => t.id === id)?.label ?? (["–", "–"] as L)))
          .join(", ") || "–",
    },
  ];

  const scenarios = [
    ...p.singles.map((x) => ({
      label: x.component.short,
      kind: ["Baustein", "Component"] as L,
      s: x.scenario,
    })),
    ...p.configurations.map((c) => ({
      label: c.config.label,
      kind: DATA_SUPPORT_LABEL[c.config.dataSupport],
      s: c.scenario,
    })),
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            {tr(["Kurzbefund für die Praxis", "Short report for the practice"])}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tr([
              "Vom Patienten selbst ausgefüllt. Alle Angaben sind Selbstauskunft und ersetzen keine Diagnostik.",
              "Completed by the patient. All entries are self-report and do not replace clinical assessment.",
            ])}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
        >
          {tr(["Drucken / als PDF speichern", "Print / save as PDF"])}
        </button>
      </div>

      {(risk === "acute" || risk === "elevated") && (
        <div className="mt-6 rounded-2xl border border-destructive bg-destructive-soft p-5">
          <p className="font-display text-base font-semibold text-destructive">
            {tr(["Risikoflag", "Risk flag"])}: {tr(riskFlag[risk]!)}
          </p>
          <p className="mt-2 text-sm">
            {tr([
              "Suizidalität explizit ansprechen, Sicherheitsplan und Erreichbarkeit klären, ggf. fachpsychiatrische Mitbeurteilung veranlassen.",
              "Address suicidality explicitly, agree a safety plan and availability, consider psychiatric co-assessment.",
            ])}
          </p>
        </div>
      )}

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">
            {tr(["Zusammenfassung", "Summary"])}
          </h2>
          <dl className="mt-4 divide-y divide-border text-sm">
            {rows.map((r) => (
              <div key={tr(r.label)} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{tr(r.label)}</dt>
                <dd className="text-right font-medium">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">
            {tr(["PHQ-9 Itemprofil", "PHQ-9 item profile"])}
          </h2>
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
        <h2 className="font-display text-lg font-semibold">
          {tr(["Modellschätzungen", "Model estimates"])}
        </h2>
        <div className="surface-card mt-4 overflow-x-auto p-1">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">
                  {tr(["Versorgungsoption", "Care option"])}
                </th>
                <th className="px-4 py-3 font-semibold">{tr(["Datenlage", "Data support"])}</th>
                <th className="px-4 py-3 font-semibold">
                  {tr(["PHQ-9 6 Mo. (Bereich)", "PHQ-9 6 mo. (range)"])}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr(["Response ≥ 50 %", "Response ≥ 50%"])}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr(["Remission < 5", "Remission < 5"])}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scenarios.map((row) => (
                <tr key={row.s.key + tr(row.label)}>
                  <td className="px-4 py-3 font-medium">{tr(row.label)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{tr(row.kind)}</td>
                  <td className="px-4 py-3">
                    {row.s.expectedEndpoint}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({row.s.endpointRange[0]}–{row.s.endpointRange[1]})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {Math.round(row.s.responseProbability * 100)}%{" "}
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(row.s.responseRange[0] * 100)}–
                      {Math.round(row.s.responseRange[1] * 100)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {Math.round(row.s.remissionProbability * 100)}%{" "}
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(row.s.remissionRange[0] * 100)}–
                      {Math.round(row.s.remissionRange[1] * 100)}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {tr([
            `${PROTOTYPE_NOTE[0]} Regelbasiertes Prototyp-Modell mit abnehmenden Kombinationsgewichten (${MODEL_META.combinationWeights.join(", ")}); Konfigurationen sind eigenständige Versorgungsformen, keine Summen einzelner Bausteine. Modellversion ${MODEL_META.version}. Keine Rangfolge, keine klinisch validierten Vorhersagen. Angaben verbleiben in der Browser-Sitzung des Patienten.`,
            `${PROTOTYPE_NOTE[1]} Rule-based prototype model with diminishing combination weights (${MODEL_META.combinationWeights.join(", ")}); configurations are distinct care arrangements, not sums of single components. Model version ${MODEL_META.version}. No ranking, no clinically validated predictions. Data remain in the patient's browser session.`,
          ])}
        </p>
      </section>
    </div>
  );
}
