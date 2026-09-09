import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, type L } from "@/lib/i18n";
import { CARE_COMPONENTS } from "@/lib/model";

export const Route = createFileRoute("/ipd-modell")({
  head: () => ({
    meta: [
      { title: "IPD-Netzwerk-Metaregression (Platzhalter) – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Vorschau der geplanten IPD-Netzwerk-Metaregression mit individuellem Risikoscore. Noch ohne Anbindung an reale Modellergebnisse.",
      },
    ],
  }),
  component: IpdModelPlaceholder,
});

/** Small pill marking a value or section as not yet computed. */
function PendingBadge() {
  const { tr } = useLang();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
      {tr(["Platzhalter – noch nicht berechnet", "Placeholder — not yet computed"])}
    </span>
  );
}

const DASH = "—";

/** Placeholder risk gauge: renders a static arc, always shows a dash. */
function RiskGauge({ label, hint }: { label: string; hint: string }) {
  const r = 54;
  const circumference = Math.PI * r; // half circle
  return (
    <div className="flex flex-col items-center text-center">
      <svg
        viewBox="0 0 120 68"
        className="w-full max-w-[220px]"
        role="img"
        aria-label={`${label}: ${hint}`}
      >
        <path
          d="M 6 64 A 54 54 0 0 1 114 64"
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 6 64 A 54 54 0 0 1 114 64"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${circumference * 0.5}`}
        />
        <text
          x="60"
          y="52"
          textAnchor="middle"
          className="font-display text-2xl font-semibold"
          fill="var(--color-muted-foreground)"
        >
          {DASH}
        </text>
      </svg>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

type NetworkNode = { id: string; label: L; x: number; y: number };

/** Layout for a small hub-and-spoke placeholder network (usual care as reference node). */
const NODES: NetworkNode[] = [
  { id: "usualCare", label: ["Übliche Versorgung", "Usual care"], x: 150, y: 110 },
  ...CARE_COMPONENTS.map((c, i) => {
    const angle = (i / CARE_COMPONENTS.length) * Math.PI * 2 - Math.PI / 2;
    return {
      id: c.id,
      label: c.short,
      x: 150 + Math.cos(angle) * 110,
      y: 110 + Math.sin(angle) * 90,
    };
  }),
];

/** Placeholder treatment network diagram: nodes = trial arms, edges = direct/indirect comparisons. */
function NetworkDiagram() {
  const { tr } = useLang();
  const hub = NODES[0]!;
  const spokes = NODES.slice(1);

  return (
    <svg viewBox="0 0 300 220" className="w-full" role="img" aria-hidden="true">
      {spokes.map((n) => (
        <line
          key={`edge-${n.id}`}
          x1={hub.x}
          y1={hub.y}
          x2={n.x}
          y2={n.y}
          stroke="var(--color-border)"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      ))}
      {NODES.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.id === "usualCare" ? 26 : 22}
            fill={n.id === "usualCare" ? "var(--color-primary-soft)" : "var(--color-secondary)"}
            stroke="var(--color-border)"
            strokeWidth={1.5}
          />
          <text
            x={n.x}
            y={n.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[7px] font-semibold"
            fill="var(--color-foreground)"
          >
            {tr(n.label).length > 16 ? `${tr(n.label).slice(0, 14)}…` : tr(n.label)}
          </text>
        </g>
      ))}
    </svg>
  );
}

const COMPARISON_ROWS = CARE_COMPONENTS;

const EFFECT_MODIFIERS: L[] = [
  ["Ausgangswert PHQ-9", "Baseline PHQ-9"],
  ["Beschwerdedauer", "Symptom duration"],
  ["Frühere Episoden", "Previous episodes"],
  ["Körperliche Komorbidität", "Physical comorbidity"],
  ["Bisherige Behandlung", "Previous treatment"],
  ["Alter", "Age"],
  ["Soziale Unterstützung", "Social support"],
  ["Substanzkonsum", "Substance use"],
];

function IpdModelPlaceholder() {
  const { tr } = useLang();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="flex flex-wrap items-center gap-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
          {tr(["In Entwicklung", "In development"])}
        </p>
        <PendingBadge />
      </div>

      <h1 className="mt-5 text-balance-tight font-display text-3xl font-semibold leading-tight sm:text-4xl">
        {tr([
          "IPD-Netzwerk-Metaregression mit individuellem Risikoscore",
          "IPD network meta-regression with individual risk score",
        ])}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {tr([
          "Diese Seite zeigt, wie das vollständige statistische Modell aus der Metaanalyse individueller Patientendaten (IPD) einmal dargestellt werden soll: alle eingeschlossenen Studienarme in einem Netzwerk, wechselseitige Vergleiche zwischen Versorgungsformen und ein individueller Risikoscore, der Effektschätzungen an das jeweilige Patientenprofil anpasst (Metaregression). Die Zahlen und die Grafik sind Platzhalter, die Struktur zeigen sollen – es sind keine berechneten Ergebnisse.",
          "This page previews how the full statistical model from the individual-patient-data (IPD) meta-analysis will eventually be presented: all included trial arms in one network, pairwise comparisons between forms of care, and an individual risk score that adapts effect estimates to a given patient profile (meta-regression). The figures and diagram are placeholders showing the intended structure — they are not computed results.",
        ])}
      </p>

      <div className="mt-6 rounded-2xl border border-warning/50 bg-accent-soft p-4">
        <p className="text-sm font-semibold">
          {tr(["Noch ohne Modellanbindung", "Not yet connected to a model"])}
        </p>
        <p className="mt-1 text-sm leading-relaxed">
          {tr([
            "Alle Werte auf dieser Seite sind Platzhalter (—). Die aktuell nutzbare Vorhersage finden Sie im vereinfachten Prototyp-Modell unter „Ergebnis“.",
            "Every value on this page is a placeholder (—). The prediction that currently works is the simplified prototype model under “Results”.",
          ])}
        </p>
        <Link
          to="/ergebnis"
          className="mt-3 inline-flex rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          {tr(["Zum Prototyp-Ergebnis", "Go to the prototype results"])}
        </Link>
      </div>

      {/* ---------------- Individual risk score ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Individueller Risikoscore", "Individual risk score"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Geplant sind drei Kennzahlen je Patientenprofil, geschätzt aus dem gemeinsamen Modell über alle Studien hinweg.",
            "Three figures are planned per patient profile, estimated jointly from the model across all trials.",
          ])}
        </p>

        <div className="surface-card mt-5 grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <RiskGauge
            label={tr(["Ausgangsrisiko", "Baseline risk"])}
            hint={tr([
              "Risiko eines ungünstigen Verlaufs unter üblicher Versorgung, angepasst an das Patientenprofil.",
              "Risk of a poor course under usual care, adjusted for the patient profile.",
            ])}
          />
          <RiskGauge
            label={tr(["Risikoreduktion", "Risk reduction"])}
            hint={tr([
              "Geschätzte absolute Risikominderung durch die gewählte Versorgungsform.",
              "Estimated absolute risk reduction from the selected form of care.",
            ])}
          />
          <RiskGauge
            label={tr(["Modellsicherheit", "Model confidence"])}
            hint={tr([
              "Unsicherheit der Schätzung, u. a. abhängig von der Zahl vergleichbarer Studienteilnehmenden.",
              "Uncertainty of the estimate, depending among other things on the number of comparable trial participants.",
            ])}
          />
        </div>
      </section>

      {/* ---------------- Treatment network ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Behandlungsnetzwerk", "Treatment network"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Jeder Knoten steht für eine Versorgungsform aus den eingeschlossenen Studien, jede Verbindung für einen direkten oder indirekten Vergleich. Die endgültige Netzwerkgrafik entsteht aus der tatsächlichen Studienstruktur.",
            "Each node stands for a form of care from the included trials, each connection for a direct or indirect comparison. The final network diagram will be built from the actual trial structure.",
          ])}
        </p>
        <div className="surface-card mt-5 p-4 sm:p-6">
          <NetworkDiagram />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {tr([
              "Platzhalter-Layout – Knotengröße, Kantenstärke und tatsächliche Verbindungen sind noch nicht durch Studiendaten bestimmt.",
              "Placeholder layout — node size, edge weight and the actual connections are not yet determined by trial data.",
            ])}
          </p>
        </div>
      </section>

      {/* ---------------- Relative effects table ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Relative Effekte im Netzwerk", "Relative effects in the network"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Vergleich jeder Versorgungsform gegenüber üblicher Versorgung, wie ihn die Netzwerk-Metaregression liefern wird.",
            "Comparison of each form of care against usual care, as the network meta-regression will eventually provide it.",
          ])}
        </p>

        <div className="surface-card mt-5 overflow-x-auto p-1">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">
                  {tr(["Versorgungsform", "Form of care"])}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr(["Beitragende Studien", "Contributing studies"])}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {tr(["Effektschätzung", "Effect estimate"])}
                </th>
                <th className="px-4 py-3 font-semibold">{tr(["95 %-KI", "95% CI"])}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON_ROWS.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{tr(c.short)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{DASH}</td>
                  <td className="px-4 py-3 text-muted-foreground">{DASH}</td>
                  <td className="px-4 py-3 text-muted-foreground">{DASH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Planned effect modifiers ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Geplante Effektmodifikatoren", "Planned effect modifiers"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Merkmale des Patientenprofils, die in der Metaregression als mögliche Effektmodifikatoren geprüft werden sollen.",
            "Patient profile characteristics planned to be tested as possible effect modifiers in the meta-regression.",
          ])}
        </p>
        <ul className="surface-card mt-5 grid gap-3 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {EFFECT_MODIFIERS.map((row) => (
            <li
              key={row[0]}
              className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-foreground"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
              {tr(row)}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          to="/fragebogen"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          {tr(["Fragebogen starten", "Start questionnaire"])}
        </Link>
        <Link
          to="/ergebnis"
          className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-secondary"
        >
          {tr(["Prototyp-Ergebnis ansehen", "View prototype results"])}
        </Link>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        {tr([
          "Dieser Entwurf dient ausschließlich der Abstimmung von Struktur und Darstellung. Sobald die IPD-Netzwerk-Metaregression vorliegt, werden die Platzhalter hier durch geprüfte Modellergebnisse ersetzt.",
          "This draft serves only to align structure and presentation. Once the IPD network meta-regression is available, the placeholders here will be replaced by validated model results.",
        ])}
      </p>
    </div>
  );
}
