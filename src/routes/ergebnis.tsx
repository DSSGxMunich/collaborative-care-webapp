import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { fill, ui, useLang } from "@/lib/i18n";
import { SEVERITY_LABEL, SEVERITY_RANGE } from "@/lib/phq9";
import { MODEL_META, posteriorEndpointDraws, type Scenario, type ScenarioId } from "@/lib/model";
import { usePrediction } from "@/lib/usePrediction";
import { SEX_OPTIONS } from "@/lib/session";
import resultsContent from "@/content/results.json";

export const Route = createFileRoute("/ergebnis")({
  head: () => ({
    meta: [
      { title: "Ihre Auswertung – Depressions-Kompass" },
      { name: "description", content: resultsContent.title.de },
    ],
  }),
  component: Results,
});

const r = resultsContent;
const PHQ9_MAX = 27;
const pct = (x: number) => (x / PHQ9_MAX) * 100;

/**
 * One row of the 12-month comparison: a forest-plot-style dot (point
 * estimate) with a whisker (credible interval), on a shared 0–27 axis, plus
 * a dashed reference line at the patient's baseline ("today"). Position and
 * distance from "today" carry the comparison — no separate rank badge.
 */
function ComparisonRow({
  label,
  scenario,
  baseline,
}: {
  label: string;
  scenario: Scenario;
  baseline: number;
}) {
  const [low, high] = scenario.endpointRange;
  return (
    <div className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {scenario.expectedEndpoint}{" "}
          <span className="text-xs text-muted-foreground">
            ({low}–{high})
          </span>
        </span>
      </div>
      <div className="relative mt-2.5 h-4">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div
          className="absolute top-0 bottom-0 border-l border-dashed border-muted-foreground/40"
          style={{ left: `${pct(baseline)}%` }}
        />
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-primary/35"
          style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card"
          style={{ left: `${pct(scenario.expectedEndpoint)}%` }}
        />
      </div>
    </div>
  );
}

/** Bins posterior draws into a small histogram, sharing the 0–27 axis with the rows above. */
function histogram(draws: number[], binCount = 14) {
  const width = PHQ9_MAX / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({ x0: i * width, count: 0 }));
  for (const d of draws) {
    const i = Math.min(binCount - 1, Math.max(0, Math.floor(d / width)));
    const bin = bins[i];
    if (bin) bin.count += 1;
  }
  return bins.map((b) => ({ label: `${b.x0.toFixed(0)}`, count: b.count }));
}

function PosteriorMini({ label, scenario }: { label: string; scenario: Scenario }) {
  const draws = useMemo(() => posteriorEndpointDraws(scenario), [scenario]);
  const data = useMemo(() => histogram(draws), [draws]);
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Bar dataKey="count" fill="var(--color-primary)" radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Legend for ComparisonRow — each swatch reuses the exact classes drawn in the chart. */
function ChartLegend({ baseline }: { baseline: number }) {
  const { tr } = useLang();
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-primary bg-card" />
        {tr(r.legend.estimate)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 shrink-0 rounded-full bg-primary/35" />
        {tr(r.legend.interval)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-0 shrink-0 border-l border-dashed border-muted-foreground/60" />
        {fill(tr(r.legend.today), { baseline })}
      </span>
    </div>
  );
}

function CrisisBanner({ level }: { level: keyof typeof r.crisis }) {
  const { tr } = useLang();
  if (level === "none") return null;
  const c = r.crisis[level];
  return (
    <div className="mt-6 rounded-md border border-destructive bg-destructive-soft p-4">
      <h2 className="text-sm font-semibold text-destructive">{tr(c.title)}</h2>
      <p className="mt-1.5 text-sm leading-relaxed">{tr(c.message)}</p>
      <Link
        to="/soforthilfe"
        className="mt-2 inline-flex text-sm font-medium text-destructive underline underline-offset-2"
      >
        {tr(ui.nav.crisis)}
      </Link>
    </div>
  );
}

function Results() {
  const { tr } = useLang();
  const p = usePrediction();
  const [revealed, setRevealed] = useState(false);
  const [showDistributions, setShowDistributions] = useState(false);

  if (!p.hydrated) return <div className="mx-auto max-w-2xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">{tr(r.title)}</h1>
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

  if (!revealed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold">{tr(r.thankYou.title)}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(r.thankYou.body)}</p>

        <CrisisBanner level={p.crisis} />

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            {tr(r.thankYou.seeResults)}
          </button>
          <Link
            to="/angebote"
            className="block w-full rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium hover:bg-secondary"
          >
            {tr(r.thankYou.seeSupport)}
          </Link>
          <p className="pt-1 text-xs text-muted-foreground">{tr(r.thankYou.privacyNote)}</p>
        </div>
      </div>
    );
  }

  const scenarioLabel = (id: ScenarioId) => tr(r.scenarios[id].short);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{tr(r.title)}</h1>

      <p className="mt-3 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm leading-relaxed">
        {tr(r.prototypeNote)}
      </p>

      <CrisisBanner level={p.crisis} />

      <div className="mt-6 flex items-baseline gap-3 border-b border-border pb-4">
        <span className="text-4xl font-semibold tabular-nums leading-none">{p.baseline}</span>
        <div className="text-sm">
          <p className="text-muted-foreground">
            {r.phq9Label} {tr(r.of27)}
          </p>
          <p className="font-medium">
            {tr(SEVERITY_LABEL[p.severity])} · {tr(r.range)} {SEVERITY_RANGE[p.severity]}
          </p>
        </div>
      </div>

      {/* ---------------- The result: PHQ-9 at 12 months ---------------- */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">{tr(r.whatCanBeExpected)}</h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {tr(r.whatCanBeExpectedBody)}
        </p>

        <div className="mt-5 divide-y divide-border rounded-md border border-border px-4">
          {p.scenarios.map((scenario) => (
            <ComparisonRow
              key={scenario.id}
              label={scenarioLabel(scenario.id)}
              scenario={scenario}
              baseline={p.baseline}
            />
          ))}
        </div>
        <ChartLegend baseline={p.baseline} />
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{tr(r.scenariosIntro)}</p>

        <button
          type="button"
          onClick={() => setShowDistributions((v) => !v)}
          className="mt-4 text-xs font-medium text-primary underline underline-offset-2"
        >
          {tr(showDistributions ? r.posterior.hide : r.posterior.show)}
        </button>
        {showDistributions && (
          <div className="mt-3 rounded-md bg-secondary p-4">
            <p className="text-xs text-muted-foreground">{tr(r.posterior.explain)}</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {p.scenarios.map((scenario) => (
                <PosteriorMini
                  key={scenario.id}
                  label={scenarioLabel(scenario.id)}
                  scenario={scenario}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {tr(r.posterior.placeholderNote)}
            </p>
          </div>
        )}
      </section>

      {/* ---------------- What influences the estimate ---------------- */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">{tr(r.whatInfluences)}</h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {tr(r.predictorsNote)}
        </p>

        <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">{tr(r.predictors.baseline.label)}</dt>
            <dd className="font-medium">{p.baseline}/27</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">{tr(r.predictors.age.label)}</dt>
            <dd className="font-medium">{p.session.profile.age ?? tr(r.predictors.notProvided)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">{tr(r.predictors.sex.label)}</dt>
            <dd className="font-medium">
              {p.session.profile.sex
                ? tr(
                    SEX_OPTIONS.find((o) => o.value === p.session.profile.sex)?.label ?? {
                      de: "–",
                      en: "–",
                    },
                  )
                : tr(r.predictors.notProvided)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap gap-2">
        <Link
          to="/praxis"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(r.actions.clinicianSummary)}
        </Link>
        <Link
          to="/angebote"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          {tr(r.actions.localSupport)}
        </Link>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        {fill(tr(r.footer), { version: MODEL_META.version })}
      </p>
    </div>
  );
}
