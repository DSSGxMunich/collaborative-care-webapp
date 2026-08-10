import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { SEVERITY_LABEL, SEVERITY_RANGE } from "@/lib/phq9";
import { RISK_MESSAGE, RISK_TITLE } from "@/lib/safety";
import { MODEL_META, type Scenario } from "@/lib/model";
import { componentLabel } from "@/lib/usePrediction";
import type { Prediction } from "@/lib/predict";

function ScenarioCard({
  scenario,
  title,
  subtitle,
  baseline,
  highlight,
}: {
  scenario: Scenario;
  title: string;
  subtitle?: string;
  baseline: number;
  highlight?: boolean;
}) {
  const { tr } = useLang();
  const pct = Math.round((scenario.expectedEndpoint / Math.max(baseline, 1)) * 100);

  return (
    <div
      className={[
        "surface-card p-5",
        highlight ? "border-primary/60 ring-1 ring-primary/25" : "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tr(["nach 6 Monaten", "at 6 months"])}
        </span>
      </div>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${100 - pct}%` }} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{tr(["PHQ-9 danach", "PHQ-9 after"])}</dt>
          <dd className="font-display text-xl font-semibold">{scenario.expectedEndpoint}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {tr(["Deutliche Besserung", "Meaningful improvement"])}
          </dt>
          <dd className="font-display text-xl font-semibold">
            {Math.round(scenario.responseProbability * 100)}%
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {tr(["Nahezu beschwerdefrei", "Near symptom-free"])}
          </dt>
          <dd className="font-display text-xl font-semibold">
            {Math.round(scenario.remissionProbability * 100)}%
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ResultsView({
  p,
  audience = "patient",
}: {
  p: Prediction;
  audience?: "patient" | "clinician";
}) {
  const { tr } = useLang();
  const topThree = p.ranked.slice(0, 3);

  return (
    <div>
      {audience === "patient" && p.risk !== "none" && (
        <div
          className={[
            "rounded-2xl border p-5",
            p.risk === "low"
              ? "border-accent bg-accent-soft"
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

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Was ist zu erwarten?", "What can be expected?"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Die Zahlen sind Schätzungen für Menschen mit einem Profil wie diesem – keine Zusage für den persönlichen Verlauf. „Deutliche Besserung“ bedeutet mindestens eine Halbierung der Beschwerden.",
            "These numbers are estimates for people with a profile like this — not a promise about the personal course. “Meaningful improvement” means at least halving of symptoms.",
          ])}
        </p>

        <div className="mt-6 grid gap-4">
          <ScenarioCard
            scenario={p.usual}
            baseline={p.baseline}
            title={tr(["Übliche Versorgung", "Usual care"])}
            subtitle={tr([
              "Reguläre Termine in der Praxis, ohne zusätzliche Bausteine.",
              "Regular appointments at the practice, without additional components.",
            ])}
          />
          {topThree.map((e, i) => {
            const scenario = p.singles.find((s) => s.key === e.id);
            if (!scenario) return null;
            const meta = componentLabel(e.id);
            return (
              <ScenarioCard
                key={e.id}
                scenario={scenario}
                baseline={p.baseline}
                highlight={i === 0}
                title={tr(meta.label)}
                subtitle={tr(meta.description)}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Kombinationen", "Combinations"])}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Bausteine wirken zusammen, aber nicht einfach additiv. Das Modell rechnet abnehmende Zusatznutzen ein.",
            "Components work together, but not simply additively. The model applies diminishing additional benefit.",
          ])}
        </p>
        <div className="mt-6 grid gap-4">
          <ScenarioCard
            scenario={p.pair}
            baseline={p.baseline}
            highlight
            title={p.pair.components.map((c) => tr(componentLabel(c).short)).join(" + ")}
            subtitle={tr([
              "Die beiden am stärksten geschätzten Bausteine für dieses Profil.",
              "The two components estimated strongest for this profile.",
            ])}
          />
          <ScenarioCard
            scenario={p.triple}
            baseline={p.baseline}
            title={p.triple.components.map((c) => tr(componentLabel(c).short)).join(" + ")}
            subtitle={tr([
              "Umfassendes Paket strukturierter Versorgung.",
              "A comprehensive structured care package.",
            ])}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Warum diese Reihenfolge?", "Why this ranking?"])}
        </h2>
        <div className="mt-6 space-y-3">
          {p.ranked.map((e) => {
            const meta = componentLabel(e.id);
            return (
              <div key={e.id} className="surface-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-semibold">{tr(meta.short)}</h3>
                  <span className="text-sm text-muted-foreground">
                    {tr(["geschätzter Zusatznutzen", "estimated added benefit"])}:{" "}
                    <strong className="text-foreground">−{e.adjustedEffect.toFixed(1)}</strong>{" "}
                    {tr(["PHQ-9 Punkte", "PHQ-9 points"])}
                  </span>
                </div>
                {e.activeModerators.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {e.activeModerators.map((m) => (
                      <li
                        key={tr(m.label)}
                        className={[
                          "rounded-full px-3 py-1 text-xs font-medium",
                          m.factor >= 1
                            ? "bg-primary-soft text-foreground"
                            : "bg-accent-soft text-accent-foreground",
                        ].join(" ")}
                      >
                        {tr(m.label)} ({m.factor >= 1 ? "+" : ""}
                        {Math.round((m.factor - 1) * 100)}%)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {tr([
                      "Keine profilspezifischen Anpassungen – es gilt der mittlere Effekt.",
                      "No profile-specific adjustments — the average effect applies.",
                    ])}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        {tr([
          `Modell ${MODEL_META.version}; Bezugszeitpunkt ${MODEL_META.followUpMonths} Monate. Die Parameter sind vorläufig und werden durch die Ergebnisse der IPD-Metaanalyse ersetzt.`,
          `Model ${MODEL_META.version}; reference time point ${MODEL_META.followUpMonths} months. Parameters are provisional and will be replaced by the IPD meta-analysis results.`,
        ])}
      </p>
    </div>
  );
}
