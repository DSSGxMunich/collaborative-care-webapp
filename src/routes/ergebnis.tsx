import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, ui, type L } from "@/lib/i18n";
import { SEVERITY_LABEL, SEVERITY_RANGE } from "@/lib/phq9";
import { RISK_MESSAGE, RISK_TITLE } from "@/lib/safety";
import {
  COMBINATION_NOTE,
  COMPONENT_NOTE,
  DATA_SUPPORT_LABEL,
  MODEL_META,
  PREDICTOR_NOTE,
  PROTOTYPE_NOTE,
  type Range,
  type Scenario,
} from "@/lib/model";
import { usePrediction } from "@/lib/usePrediction";
import { CONSTRAINTS, PREFERENCES } from "@/lib/session";

export const Route = createFileRoute("/ergebnis")({
  head: () => ({
    meta: [
      { title: "Ihre Auswertung – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Illustrative Prototyp-Schätzungen für Bausteine strukturierter Collaborative Care: PHQ-9 nach 6 Monaten, Ansprechwahrscheinlichkeit und Remission für Personen mit ähnlichem Profil.",
      },
      { property: "og:title", content: "Ihre Auswertung – Depressions-Kompass" },
      {
        property: "og:description",
        content:
          "PHQ-9-Ergebnis, Sicherheitshinweise und Prototyp-Schätzungen für verschiedene Versorgungsoptionen.",
      },
    ],
  }),
  component: Results,
});

/** Tooltip label: hover/focus text plus a screen-reader friendly explanation. */
function Info({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        title={hint}
        aria-label={`${label}: ${hint}`}
        className="flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-border text-[9px] font-bold text-muted-foreground"
      >
        i
      </button>
    </span>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const rangePct = (r: Range) => `${Math.round(r[0] * 100)}–${Math.round(r[1] * 100)}%`;

/** These ranges come from the fitted coefficients' credible intervals (see model.ts). */
const CI_LABEL: L = ["ca. 95 %-Kredibilitätsintervall", "approx. 95% credible interval"];

const MEASURES = {
  endpoint: {
    label: ["Geschätzter PHQ-9 nach 6 Monaten", "Estimated PHQ-9 at 6 months"] as L,
    short: ["PHQ-9 nach 6 Monaten", "PHQ-9 at 6 months"] as L,
    hint: [
      "Voraussichtliche Schwere der depressiven Beschwerden nach 6 Monaten für Personen mit einem ähnlichen Profil, auf der PHQ-9-Skala von 0 bis 27.",
      "Likely severity of depressive symptoms after 6 months for people with a similar profile, on the PHQ-9 scale from 0 to 27.",
    ] as L,
  },
  response: {
    label: ["Chance auf Ansprechen", "Chance of treatment response"] as L,
    short: ["Ansprechen", "Response"] as L,
    hint: [
      "Wahrscheinlichkeit, dass der PHQ-9-Wert gegenüber dem Ausgangswert um mindestens 50 % zurückgeht.",
      "Probability that the PHQ-9 score falls by at least 50% compared with baseline.",
    ] as L,
  },
  remission: {
    label: ["Chance auf Remission", "Chance of remission"] as L,
    short: ["Remission", "Remission"] as L,
    hint: [
      `Wahrscheinlichkeit, nur noch minimale Beschwerden zu haben – vorläufig definiert als PHQ-9 unter ${MODEL_META.remissionCutoff}.`,
      `Probability of having only minimal symptoms — provisionally defined as PHQ-9 below ${MODEL_META.remissionCutoff}.`,
    ] as L,
  },
};

function OutcomeCard({
  scenario,
  title,
  subtitle,
  baseline,
  badge,
  footnote,
}: {
  scenario: Scenario;
  title: string;
  subtitle?: string;
  baseline: number;
  badge?: string;
  footnote?: string;
}) {
  const { tr } = useLang();
  const share = Math.round((scenario.expectedEndpoint / Math.max(baseline, 1)) * 100);

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {badge ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${100 - share}%` }} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">
            <Info label={tr(MEASURES.endpoint.short)} hint={tr(MEASURES.endpoint.hint)} />
          </dt>
          <dd className="font-display text-xl font-semibold">{scenario.expectedEndpoint}</dd>
          <dd className="text-xs text-muted-foreground">
            {tr(CI_LABEL)} {scenario.endpointRange[0]}–{scenario.endpointRange[1]}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <Info label={tr(MEASURES.response.short)} hint={tr(MEASURES.response.hint)} />
          </dt>
          <dd className="font-display text-xl font-semibold">
            {pct(scenario.responseProbability)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {tr(CI_LABEL)} {rangePct(scenario.responseRange)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <Info label={tr(MEASURES.remission.short)} hint={tr(MEASURES.remission.hint)} />
          </dt>
          <dd className="font-display text-xl font-semibold">
            {pct(scenario.remissionProbability)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {tr(CI_LABEL)} {rangePct(scenario.remissionRange)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-muted-foreground">
        {footnote ??
          tr([
            "Illustrative Platzhalterwerte zur Erprobung der Darstellung.",
            "Illustrative placeholder values for testing the presentation.",
          ])}
      </p>
    </div>
  );
}

function Results() {
  const { tr } = useLang();
  const p = usePrediction();
  const [revealed, setRevealed] = useState(false);

  if (!p.hydrated) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="surface-card p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">{tr(ui.results)}</h1>
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

  if (!revealed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-semibold">
          {tr(["Danke für Ihre Antworten", "Thank you for your answers"])}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Sie entscheiden selbst, ob Sie Ihre persönliche Auswertung jetzt sehen möchten. Manche Menschen finden Zahlen zu ihrer Situation hilfreich, andere empfinden sie als belastend. Beides ist in Ordnung – Sie können die Auswertung auch später oder gemeinsam mit Ihrer Ärztin oder Ihrem Arzt ansehen.",
            "You decide whether you want to see your personal results now. Some people find numbers about their situation helpful, others find them distressing. Both are fine — you can also look at the results later or together with your doctor.",
          ])}
        </p>

        {p.risk !== "none" && (
          <div
            className={[
              "mt-6 rounded-2xl border p-5",
              p.risk === "low"
                ? "border-warning/50 bg-accent-soft"
                : "border-destructive bg-destructive-soft",
            ].join(" ")}
          >
            <h2 className="font-display text-base font-semibold">{tr(RISK_TITLE[p.risk])}</h2>
            <p className="mt-2 text-sm leading-relaxed">{tr(RISK_MESSAGE[p.risk])}</p>
            <Link
              to="/soforthilfe"
              className="mt-3 inline-flex rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
            >
              {tr(["Krisenkontakte", "Crisis contacts"])}
            </Link>
          </div>
        )}

        <div className="surface-card mt-6 space-y-3 p-6">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
          >
            {tr(["Ja, meine Auswertung anzeigen", "Yes, show my results"])}
          </button>
          <Link
            to="/angebote"
            className="block w-full rounded-xl border border-border bg-card px-6 py-3 text-center text-sm font-semibold transition-colors hover:bg-secondary"
          >
            {tr([
              "Nein danke – stattdessen Angebote vor Ort ansehen",
              "No thanks — show local support instead",
            ])}
          </Link>
          <Link
            to="/praxis"
            className="block w-full rounded-xl border border-border bg-card px-6 py-3 text-center text-sm font-semibold transition-colors hover:bg-secondary"
          >
            {tr([
              "Nur die Zusammenfassung für die Praxis öffnen",
              "Only open the summary for the practice",
            ])}
          </Link>
          <p className="text-xs text-muted-foreground">
            {tr([
              "Ihre Antworten bleiben ausschließlich in diesem Browser gespeichert. Sie können die Auswertung jederzeit über diese Seite öffnen.",
              "Your answers stay only in this browser. You can open the results from this page at any time.",
            ])}
          </p>
        </div>
      </div>
    );
  }

  const chosenPrefs = PREFERENCES.filter((x) => p.session.profile.preferences.includes(x.id));

  const chosenConstraints = CONSTRAINTS.filter((x) => p.session.profile.constraints.includes(x.id));

  const gpQuestions: L[] = [
    [
      "Welche Bausteine strukturierter Versorgung kann Ihre Praxis mir konkret anbieten – und wer wäre meine feste Ansprechperson?",
      "Which components of structured care can your practice actually offer me — and who would be my named contact person?",
    ],
    [
      "Wie oft wären Kontakte oder Verlaufsmessungen vorgesehen, und passt das zu meinem Alltag?",
      "How often would contacts or symptom measurements happen, and does that fit my everyday life?",
    ],
    [
      "Woran würden wir gemeinsam erkennen, dass sich etwas verbessert – und wann würden wir den Plan ändern?",
      "How would we jointly recognise that things are improving — and when would we change the plan?",
    ],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">
        {tr(["Ihre Auswertung", "Your results"])}
      </h1>

      <div className="mt-4 rounded-2xl border border-warning/50 bg-accent-soft p-4">
        <p className="text-sm font-semibold">{tr(["Forschungsprototyp", "Research prototype"])}</p>
        <p className="mt-1 text-sm leading-relaxed">{tr(PROTOTYPE_NOTE)}</p>
      </div>

      {p.risk !== "none" && (
        <div
          className={[
            "mt-6 rounded-2xl border p-5",
            p.risk === "low"
              ? "border-warning/50 bg-accent-soft"
              : "border-destructive bg-destructive-soft",
          ].join(" ")}
        >
          <h2 className="font-display text-base font-semibold">{tr(RISK_TITLE[p.risk])}</h2>
          <p className="mt-2 text-sm leading-relaxed">{tr(RISK_MESSAGE[p.risk])}</p>
          <Link
            to="/soforthilfe"
            className="mt-3 inline-flex rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
          >
            {tr(["Krisenkontakte", "Crisis contacts"])}
          </Link>
        </div>
      )}

      <section className="surface-card mt-6 flex flex-wrap items-center gap-6 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            PHQ-9
          </p>
          <p className="font-display text-5xl font-semibold leading-none">{p.baseline}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(["von 27 Punkten", "of 27 points"])}
          </p>
        </div>
        <div className="min-w-[14rem] flex-1">
          <p className="font-display text-lg font-semibold">{tr(SEVERITY_LABEL[p.severity])}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr(["Bereich", "Range"])} {SEVERITY_RANGE[p.severity]}
          </p>
        </div>
      </section>

      {/* ---------------- What can be expected ---------------- */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Was ist zu erwarten?", "What can be expected?"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr([
            `Für jede Versorgungsform werden drei Größen zum Zeitpunkt ${MODEL_META.followUpMonths} Monate dargestellt. Alle Zahlen sind Schätzungen für Gruppen von Personen mit einem ähnlichen Profil – keine Zusage für Ihren persönlichen Verlauf.`,
            `For each form of care, three measures are shown at ${MODEL_META.followUpMonths} months. All numbers are estimates for groups of people with a similar profile — not a promise about your personal course.`,
          ])}
        </p>

        <dl className="surface-card mt-4 space-y-3 p-5 text-sm">
          {(["endpoint", "response", "remission"] as const).map((k) => (
            <div key={k}>
              <dt className="font-semibold">
                <Info label={tr(MEASURES[k].label)} hint={tr(MEASURES[k].hint)} />
              </dt>
              <dd className="mt-1 leading-relaxed text-muted-foreground">{tr(MEASURES[k].hint)}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 rounded-xl bg-secondary p-4 text-xs leading-relaxed text-muted-foreground">
          {tr(COMPONENT_NOTE)}
        </p>

        <div className="mt-6 grid gap-4">
          <OutcomeCard
            scenario={p.usual}
            baseline={p.baseline}
            title={tr(["Übliche hausärztliche Versorgung", "Usual GP care"])}
            subtitle={tr([
              "Behandlung wie bisher: Termine bei Bedarf, Beratung, Verlaufsbeobachtung.",
              "Care as before: appointments as needed, advice and watchful monitoring.",
            ])}
            badge={tr(["Vergleichsgrundlage", "Reference"])}
          />
          {p.singles.map((s) => (
            <OutcomeCard
              key={s.component.id}
              scenario={s.scenario}
              baseline={p.baseline}
              title={tr(s.component.label)}
              subtitle={tr(s.component.description)}
              badge={tr(["Beispiel-Baustein", "Example component"])}
            />
          ))}
        </div>
      </section>

      {/* ---------------- Configurations ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Versorgungskonfigurationen", "Care configurations"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr(COMBINATION_NOTE)}
        </p>

        <div className="mt-6 grid gap-4">
          {p.configurations.map((c) => (
            <OutcomeCard
              key={c.config.id}
              scenario={c.scenario}
              baseline={p.baseline}
              title={tr(c.config.label)}
              subtitle={tr(c.config.description)}
              badge={tr(DATA_SUPPORT_LABEL[c.config.dataSupport])}
              footnote={`${tr(c.config.dataNote)} ${tr([
                "Illustrative Platzhalterwerte.",
                "Illustrative placeholder values.",
              ])}`}
            />
          ))}
        </div>
      </section>

      {/* ---------------- Side-by-side comparison ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr([
            "Was ist bei verschiedenen Versorgungsoptionen zu erwarten?",
            "What can be expected with different care options?",
          ])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Gegenüberstellung ohne Rangfolge. Die angegebenen Bereiche sind ungefähre 95 %-Kredibilitätsintervalle des Modells; Unterschiede innerhalb dieser Bereiche sind nicht bedeutsam.",
            "A side-by-side view without ranking. The ranges shown are approximate 95% credible intervals from the model; differences within these ranges are not meaningful.",
          ])}
        </p>

        <div className="surface-card mt-5 overflow-x-auto p-1">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">
                  {tr(["Versorgungsoption", "Care option"])}
                </th>
                <th className="px-4 py-3 font-semibold">
                  <Info label={tr(MEASURES.endpoint.short)} hint={tr(MEASURES.endpoint.hint)} />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <Info
                    label={tr(["≥ 50 % Rückgang", "≥ 50% reduction"])}
                    hint={tr(MEASURES.response.hint)}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <Info label={tr(MEASURES.remission.short)} hint={tr(MEASURES.remission.hint)} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {p.configurations.map((c) => (
                <tr key={c.config.id}>
                  <td className="px-4 py-3 font-medium">{tr(c.config.label)}</td>
                  <td className="px-4 py-3">
                    {c.scenario.expectedEndpoint}
                    <span className="block text-xs text-muted-foreground">
                      {c.scenario.endpointRange[0]}–{c.scenario.endpointRange[1]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {pct(c.scenario.responseProbability)}
                    <span className="block text-xs text-muted-foreground">
                      {rangePct(c.scenario.responseRange)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {pct(c.scenario.remissionProbability)}
                    <span className="block text-xs text-muted-foreground">
                      {rangePct(c.scenario.remissionRange)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm leading-relaxed">
          {tr([
            `Für Personen mit einem ähnlichen Profil schätzt das Modell für „${tr(
              p.favourable.config.label,
            )}“ günstigere Ergebnisse. Das ist keine Aussage darüber, welche Behandlung „die beste“ ist – ob eine Versorgungsform für Sie passt, hängt auch von Ihren Möglichkeiten und Vorlieben ab.`,
            `For people with a similar profile, the model estimates more favourable outcomes for “${tr(
              p.favourable.config.label,
            )}”. This does not say which treatment is “the best” — whether a form of care suits you also depends on your circumstances and preferences.`,
          ])}
        </p>
      </section>

      {/* ---------------- What influences the estimates ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Was beeinflusst diese Schätzungen?", "What influences these estimates?"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr(PREDICTOR_NOTE)}
        </p>

        <div className="surface-card mt-5 divide-y divide-border">
          {p.predictors.map((row) => (
            <div key={tr(row.label)} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold">{tr(row.label)}</h3>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium",
                    row.available
                      ? "bg-primary-soft text-foreground"
                      : "bg-secondary text-muted-foreground",
                  ].join(" ")}
                >
                  {tr(row.value)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tr(row.usedFor)}
              </p>
            </div>
          ))}
        </div>

        <div className="surface-card mt-4 p-5">
          <h3 className="font-display text-base font-semibold">
            {tr([
              "Profilmerkmale, die das Modell hier anpassen",
              "Profile characteristics adjusting the model here",
            ])}
          </h3>
          <ul className="mt-3 space-y-3 text-sm">
            {p.singles.map((s) => (
              <li key={s.component.id}>
                <span className="font-semibold">{tr(s.component.short)}: </span>
                {s.estimate.activeModerators.length > 0 ? (
                  <span className="text-muted-foreground">
                    {s.estimate.activeModerators
                      .map(
                        (m) =>
                          `${tr(m.label)} (${m.delta >= 0 ? "+" : ""}${m.delta} ${tr([
                            "Punkte",
                            "points",
                          ])})`,
                      )
                      .join(", ")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {tr([
                      "keine profilspezifische Anpassung – es gilt der mittlere Wert",
                      "no profile-specific adjustment — the average value applies",
                    ])}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {tr([
              "Diese Anpassungen sind statistische Zusammenhänge im Prototyp-Modell, keine Erklärung für Ursachen. Ihre Vorlieben und praktischen Möglichkeiten gehen hier bewusst nicht ein.",
              "These adjustments are statistical associations in the prototype model, not causal explanations. Your preferences and practical circumstances are deliberately not part of them.",
            ])}
          </p>
        </div>
      </section>

      {/* ---------------- Shared decision-making ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Gemeinsam entscheiden", "Deciding together"])}
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="surface-card p-5">
            <h3 className="font-display text-lg font-semibold">
              {tr(["Was zeigen die Daten?", "What do the data show?"])}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {tr([
                "Modellgestützte Schätzungen klinischer Ergebnisse für Personen mit einem ähnlichen Profil – aktuell illustrative Platzhalterwerte.",
                "Model-based estimates of clinical outcomes for people with a similar profile — currently illustrative placeholder values.",
              ])}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <span className="font-semibold">{tr(MEASURES.endpoint.short)}: </span>
                {p.usual.expectedEndpoint} {tr(["bei üblicher Versorgung", "with usual care"])} →{" "}
                {p.favourable.scenario.expectedEndpoint} {tr(["bei", "with"])}{" "}
                {tr(p.favourable.config.label)}
              </li>
              <li>
                <span className="font-semibold">{tr(MEASURES.response.short)}: </span>
                {pct(p.usual.responseProbability)} →{" "}
                {pct(p.favourable.scenario.responseProbability)}
              </li>
              <li>
                <span className="font-semibold">{tr(MEASURES.remission.short)}: </span>
                {pct(p.usual.remissionProbability)} →{" "}
                {pct(p.favourable.scenario.remissionProbability)}
              </li>
            </ul>
          </div>

          <div className="surface-card p-5">
            <h3 className="font-display text-lg font-semibold">
              {tr(["Was passt zu mir?", "What suits me?"])}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {tr([
                "Ihre Vorlieben und praktischen Rahmenbedingungen. Sie gehen nicht in die Schätzungen ein, entscheiden aber mit, was umsetzbar ist.",
                "Your preferences and practical circumstances. They do not enter the estimates, but they co-determine what is feasible.",
              ])}
            </p>
            <p className="mt-3 text-sm font-semibold">
              {tr(["Kann ich mir vorstellen", "I could imagine"])}
            </p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {chosenPrefs.length > 0 ? (
                chosenPrefs.map((x) => (
                  <li
                    key={x.id}
                    className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium"
                  >
                    {tr(x.label)}
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground">
                  {tr(["keine Angabe", "not provided"])}
                </li>
              )}
            </ul>
            <p className="mt-3 text-sm font-semibold">
              {tr(["Praktische Grenzen", "Practical limits"])}
            </p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {chosenConstraints.length > 0 ? (
                chosenConstraints.map((x) => (
                  <li
                    key={x.id}
                    className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium"
                  >
                    {tr(x.label)}
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground">
                  {tr(["keine Angabe", "not provided"])}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="surface-card mt-4 p-5">
          <h3 className="font-display text-base font-semibold">
            {tr([
              "Fragen für das Gespräch in der Praxis",
              "Questions for the conversation at your practice",
            ])}
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            {gpQuestions.map((q) => (
              <li key={tr(q)}>{tr(q)}</li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/praxis"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          {tr(["Zusammenfassung für die Praxis", "Summary for the practice"])}
        </Link>
        <Link
          to="/angebote"
          className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-secondary"
        >
          {tr(["Passende Angebote vor Ort", "Suitable local offers"])}
        </Link>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        {tr([
          `Modell ${MODEL_META.version}; Bezugszeitpunkt ${MODEL_META.followUpMonths} Monate. ${PROTOTYPE_NOTE[0]} Ihre Antworten bleiben ausschließlich in dieser Browser-Sitzung auf Ihrem Gerät.`,
          `Model ${MODEL_META.version}; reference time point ${MODEL_META.followUpMonths} months. ${PROTOTYPE_NOTE[1]} Your answers stay solely in this browser session on your device.`,
        ])}
      </p>
    </div>
  );
}
