import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { effectiveGad7Score } from "@/lib/gad7";
import { fill, ui, useLang } from "@/lib/i18n";
import { SEVERITY_LABEL, SEVERITY_RANGE } from "@/lib/phq9";
import { posteriorEndpointDraws, type Scenario } from "@/lib/model";
import { usePrediction } from "@/lib/usePrediction";
import { ageFromBirthDate, SEX_OPTIONS } from "@/lib/session";
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
 * a solid reference line at the patient's baseline ("today"). Position and
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
          className="absolute top-0 bottom-0 border-l-2 border-foreground/70"
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

type HistogramBin = { label: string; range: string; count: number };

/**
 * A shared x-domain (with a little padding), computed once across every
 * scenario currently shown, so every mini histogram below bins over the
 * same range and stays comparable to its neighbors. Deliberately NOT the
 * full 0–27 clinical scale: posteriorEndpointDraws() only carries
 * uncertainty in the model's estimate of the *mean* outcome (see
 * src/lib/model.ts — sigma/residual variance isn't included), which is
 * typically a narrow band. Binning that over the full 0–27 range left
 * most bins empty — usually only 2–3 of 14 populated — regardless of how
 * many real draws (2000) backed the chart.
 */
function posteriorDomain(scenarios: Scenario[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const scenario of scenarios) {
    for (const d of posteriorEndpointDraws(scenario)) {
      if (d < min) min = d;
      if (d > max) max = d;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, PHQ9_MAX];
  if (min === max) return [Math.max(0, min - 1), Math.min(PHQ9_MAX, max + 1)];
  const pad = (max - min) * 0.08;
  return [Math.max(0, min - pad), Math.min(PHQ9_MAX, max + pad)];
}

/** Bins posterior draws into a small histogram over the given shared domain (see posteriorDomain). */
function histogram(draws: number[], domain: [number, number], binCount = 16): HistogramBin[] {
  const [lo, hi] = domain;
  const width = (hi - lo) / binCount || 1;
  // A fixed 1 decimal place isn't always enough to tell bins apart: when the
  // shared domain is narrow (e.g. a tightly estimated set of scenarios),
  // bin width can drop well under 0.1, so several distinct bins' edges all
  // round to the same displayed value (e.g. every bin from x0=1.02 to
  // x0=1.28 rounding to "1.1" or "1.2") -- different bins, different draw
  // counts, but an identical label/range shown on hover. Scale the decimal
  // count to the bin width so adjacent edges can't collide; clamp to
  // [1, 3] to keep the usual case at one decimal and avoid absurd precision.
  const decimals = Math.min(3, Math.max(1, Math.ceil(-Math.log10(width))));
  const bins = Array.from({ length: binCount }, (_, i) => ({
    x0: lo + i * width,
    x1: lo + (i + 1) * width,
    count: 0,
  }));
  for (const d of draws) {
    const i = Math.min(binCount - 1, Math.max(0, Math.floor((d - lo) / width)));
    const bin = bins[i];
    if (bin) bin.count += 1;
  }
  return bins.map((b) => ({
    label: b.x0.toFixed(decimals),
    range: `${b.x0.toFixed(decimals)}–${b.x1.toFixed(decimals)}`,
    count: b.count,
  }));
}

/** Per-bar hover: the bin's PHQ-9 range and its share of the 2000 draws — the histogram has no other way to show exact values, since axis labels are sparse by design. */
function PosteriorTooltip({
  active,
  payload,
  total,
}: TooltipProps<number, string> & { total: number }) {
  const { tr } = useLang();
  const bin = payload?.[0]?.payload as HistogramBin | undefined;
  if (!active || !bin) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5 text-xs shadow-sm">
      <p className="font-medium tabular-nums">
        {r.phq9Label} {bin.range}
      </p>
      <p className="text-muted-foreground">
        {fill(tr(r.posterior.tooltipDraws), { count: bin.count, total })}
      </p>
    </div>
  );
}

/** Rounds a rough step up to a "nice" 1/2/5 × 10^n value, so tick spacing reads as an even, round sequence. */
function niceStep(roughStep: number): number {
  if (!(roughStep > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function PosteriorMini({
  label,
  scenario,
  domain,
}: {
  label: string;
  scenario: Scenario;
  domain: [number, number];
}) {
  const draws = useMemo(() => posteriorEndpointDraws(scenario), [scenario]);
  const data = useMemo(() => histogram(draws, domain), [draws, domain]);
  // Bin width is usually well under 1 PHQ-9 point, so many adjacent bins
  // round to the same displayed integer. Deduplicating ticks by their
  // rounded value alone (the previous approach) kept whichever bin edges
  // happened to round first, which produces an uneven sequence like
  // "5 6 7 8 10 11" -- the gap after 8 isn't a gap in the data, it's an
  // artifact of where bin edges land relative to whole numbers. Instead,
  // pick a round step (1, 2 or 5 × 10^n) for ~5-6 ticks across the domain,
  // then snap each of those evenly-spaced values to its nearest actual
  // bin, so XAxis (keyed on the categorical bin label) can place it.
  const xTicks = useMemo(() => {
    if (data.length === 0) return [];
    const [lo, hi] = domain;
    const step = niceStep((hi - lo) / 5);
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      let closest = data[0]!;
      let bestDist = Infinity;
      for (const bin of data) {
        const dist = Math.abs(Number(bin.label) - v);
        if (dist < bestDist) {
          bestDist = dist;
          closest = bin;
        }
      }
      if (!seen.has(closest.label)) {
        seen.add(closest.label);
        ticks.push(closest.label);
      }
    }
    return ticks;
  }, [data, domain]);
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 2, bottom: 0, left: 2 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              ticks={xTicks}
              tickFormatter={(v: string) => Number(v).toFixed(0)}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "var(--color-border)", opacity: 0.4 }}
              content={<PosteriorTooltip total={draws.length} />}
            />
            <Bar dataKey="count" fill="var(--color-primary)" radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Full-viewport-height, centered content block shown before the results, so
 * the reader can't land straight into the numbers without at least
 * scrolling past this once. No click-through/JS gating — the scroll itself
 * is the interaction, and the content stays reachable via normal scrolling
 * (back up) at any time.
 */
function DisclaimerGate() {
  const { tr } = useLang();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center border-b border-warning/40 bg-warning-soft px-4 py-16 text-center">
      <div className="max-w-lg">
        <h2 className="text-xl font-semibold">{tr(r.prototypeNote.heading)}</h2>
        <p className="mt-3 text-sm leading-relaxed">{tr(r.prototypeNote.intro)}</p>
        <ul className="mt-4 space-y-1.5 text-left text-sm leading-relaxed">
          {r.prototypeNote.items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true">·</span>
              <span>{tr(item)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed">{tr(r.prototypeNote.closing)}</p>
      </div>
      <div className="mt-10 animate-bounce text-xs font-medium text-muted-foreground">
        {tr(r.prototypeNote.scrollHint)} ↓
      </div>
    </div>
  );
}

/** Legend for ComparisonRow — each swatch reuses the exact classes drawn in the chart. */
function ChartLegend() {
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
        <span className="h-2.5 w-0 shrink-0 border-l-2 border-foreground/70" />
        {tr(r.legend.todayLine)} · {tr(r.legend.scale)}
      </span>
    </div>
  );
}

/**
 * Points to the baseline ("today") position on the shared 0–27 axis, sitting
 * directly above the comparison rows so the reader sees where "today" falls
 * among the results, rather than only reading it out of the legend below.
 */
function BaselinePointer({ baseline }: { baseline: number }) {
  const { tr } = useLang();
  const left = Math.min(94, Math.max(6, pct(baseline)));
  return (
    <div className="relative mt-5 h-9 px-4">
      <div
        className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center gap-1"
        style={{ left: `${left}%` }}
      >
        <span className="whitespace-nowrap text-xs font-bold text-foreground">
          {fill(tr(r.legend.today), { baseline })}
        </span>
        <span className="h-2.5 w-0.5 shrink-0 bg-foreground/70" />
      </div>
    </div>
  );
}

type ScenarioTab = "combo" | "single";

function Results() {
  const { tr } = useLang();
  const p = usePrediction();
  const [revealed, setRevealed] = useState(false);
  const [showDistributions, setShowDistributions] = useState(false);
  const [tab, setTab] = useState<ScenarioTab>("single");

  // buildPredictions() (inside usePrediction) always returns scenarios/
  // singleScenarios, even before hydration/completion, so this is safe to
  // compute here — it must be, since hooks can't follow the early returns
  // below. Only actually binned while the panel is open (the common case
  // is collapsed) — see posteriorDomain()'s own comment for why the
  // domain isn't just 0–27.
  const activeScenarios = tab === "combo" ? p.scenarios : p.singleScenarios;
  const distributionsDomain = useMemo(
    () =>
      showDistributions ? posteriorDomain(activeScenarios) : ([0, PHQ9_MAX] as [number, number]),
    [showDistributions, activeScenarios],
  );

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

  /** Usual care keeps its own short label; a package's (or single component's) label is its active components joined together. */
  const scenarioLabel = (scenario: Scenario) =>
    scenario.id === "usualCare"
      ? tr(r.scenarios.usualCare.short)
      : scenario.components.map((id) => tr(r.components[id].short)).join(" + ");

  const activeIntro = tab === "combo" ? r.scenariosIntro : r.singleScenariosIntro;

  return (
    <div>
      <DisclaimerGate />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold">{tr(r.title)}</h1>

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

          <div className="mt-4 inline-flex rounded-md border border-border p-0.5 text-sm">
            {(["single", "combo"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={[
                  "rounded-[5px] px-3 py-1.5 font-medium transition-colors",
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tr(r.scenarioTabs[t])}
              </button>
            ))}
          </div>

          <BaselinePointer baseline={p.baseline} />
          <div className="divide-y divide-border rounded-md border border-border px-4">
            {activeScenarios.map((scenario) => (
              <ComparisonRow
                key={scenario.id}
                label={scenarioLabel(scenario)}
                scenario={scenario}
                baseline={p.baseline}
              />
            ))}
          </div>
          <ChartLegend />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{tr(activeIntro)}</p>

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
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activeScenarios.map((scenario) => (
                  <PosteriorMini
                    key={scenario.id}
                    label={scenarioLabel(scenario)}
                    scenario={scenario}
                    domain={distributionsDomain}
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
              <dd className="font-medium">
                {p.session.profile.birthDate
                  ? ageFromBirthDate(p.session.profile.birthDate).toFixed(2)
                  : tr(r.predictors.notProvided)}
              </dd>
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
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{tr(r.predictors.gad7.label)}</dt>
              <dd className="font-medium">
                {(() => {
                  const score = effectiveGad7Score(p.session.profile);
                  return score !== null ? `${score}/21` : tr(r.predictors.notProvided);
                })()}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{tr(r.predictors.riskScore.label)}</dt>
              <dd className="font-medium">
                {p.predictors.find((row) => row.id === "riskScore")?.value ?? "–"}
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
      </div>
    </div>
  );
}
