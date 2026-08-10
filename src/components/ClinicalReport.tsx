import { useLang, type L } from "@/lib/i18n";
import { PHQ9_ITEMS, SEVERITY_LABEL } from "@/lib/phq9";
import { MODEL_META } from "@/lib/model";
import { componentLabel } from "@/lib/usePrediction";
import { PREFERENCES, PRIOR_TREATMENTS } from "@/lib/session";
import type { Prediction } from "@/lib/predict";

const YES_NO: Record<string, L> = {
  yes: ["ja", "yes"],
  no: ["nein", "no"],
};

const DURATION_LABEL: Record<string, L> = {
  lt3m: ["< 3 Monate", "< 3 months"],
  "3to12m": ["3–12 Monate", "3–12 months"],
  gt12m: ["> 12 Monate", "> 12 months"],
};

export const RISK_FLAG: Record<string, L> = {
  none: ["kein Hinweis", "no indication"],
  low: ["Item 9 positiv (einzelne Tage)", "item 9 positive (several days)"],
  elevated: ["erhöht – zeitnahe Abklärung", "elevated — timely review"],
  acute: ["AKUT – sofortiges Handeln", "ACUTE — act immediately"],
};

export function ClinicalReport({ p }: { p: Prediction }) {
  const { tr } = useLang();
  const { profile, safety } = p.session;
  const risk = p.risk;

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
      value: tr(RISK_FLAG[risk] ?? RISK_FLAG["none"]!),
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
      label: ["Patientenpräferenzen", "Patient preferences"],
      value:
        profile.preferences
          .map((id) => tr(PREFERENCES.find((t) => t.id === id)?.label ?? (["–", "–"] as L)))
          .join(", ") || "–",
    },
  ];

  const scenarios = [
    { label: ["Übliche Versorgung", "Usual care"] as L, s: p.usual },
    ...p.singles.slice(0, 3).map((s) => ({
      label: componentLabel(s.components[0]!).short,
      s,
    })),
    {
      label: [
        p.pair.components.map((c) => componentLabel(c).short[0]).join(" + "),
        p.pair.components.map((c) => componentLabel(c).short[1]).join(" + "),
      ] as L,
      s: p.pair,
    },
    {
      label: [
        p.triple.components.map((c) => componentLabel(c).short[0]).join(" + "),
        p.triple.components.map((c) => componentLabel(c).short[1]).join(" + "),
      ] as L,
      s: p.triple,
    },
  ];

  return (
    <div>
      {(risk === "acute" || risk === "elevated") && (
        <div className="rounded-2xl border border-destructive bg-destructive-soft p-5">
          <p className="font-display text-base font-semibold text-destructive">
            {tr(["Risikoflag", "Risk flag"])}: {tr(RISK_FLAG[risk]!)}
          </p>
          <p className="mt-2 text-sm">
            {tr([
              "Suizidalität explizit ansprechen, Sicherheitsplan und Erreichbarkeit klären, ggf. fachpsychiatrische Mitbeurteilung veranlassen.",
              "Address suicidality explicitly, agree a safety plan and availability, consider psychiatric co-assessment.",
            ])}
          </p>
        </div>
      )}

      <section className="mt-6 grid gap-6 md:grid-cols-2">
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
                <th className="px-4 py-3 font-semibold">{tr(["Szenario", "Scenario"])}</th>
                <th className="px-4 py-3 font-semibold">Δ PHQ-9</th>
                <th className="px-4 py-3 font-semibold">{tr(["PHQ-9 6 Mo.", "PHQ-9 6 mo."])}</th>
                <th className="px-4 py-3 font-semibold">Response</th>
                <th className="px-4 py-3 font-semibold">Remission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scenarios.map((row) => (
                <tr key={row.s.key + tr(row.label)}>
                  <td className="px-4 py-3 font-medium">{tr(row.label)}</td>
                  <td className="px-4 py-3">−{row.s.expectedDrop}</td>
                  <td className="px-4 py-3">{row.s.expectedEndpoint}</td>
                  <td className="px-4 py-3">{Math.round(row.s.responseProbability * 100)}%</td>
                  <td className="px-4 py-3">{Math.round(row.s.remissionProbability * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {tr([
            `Regelbasiertes, additives Modell mit abnehmenden Kombinationsgewichten (${MODEL_META.combinationWeights.join(", ")}); Effekte in PHQ-9-Punkten, gepoolte SD ${MODEL_META.pooledSd}. Modellversion ${MODEL_META.version} – vorläufige Parameter, ersetzbar durch die Koeffizienten der IPD-Metaanalyse.`,
            `Rule-based additive model with diminishing combination weights (${MODEL_META.combinationWeights.join(", ")}); effects in PHQ-9 points, pooled SD ${MODEL_META.pooledSd}. Model version ${MODEL_META.version} — provisional parameters, replaceable with the IPD meta-analysis coefficients.`,
          ])}
        </p>
      </section>
    </div>
  );
}
