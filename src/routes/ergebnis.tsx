import { useId, useMemo, useState } from "react";
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
import { fill, ui, useLang } from "@/lib/i18n";
import { SEVERITY_LABEL, SEVERITY_RANGE } from "@/lib/phq9";
import { posteriorEndpointDraws, type Scenario } from "@/lib/model";
import { generateResultsPdf } from "@/lib/pdf";
import { usePrediction } from "@/lib/usePrediction";
import { ageFromBirthDate, SEX_OPTIONS } from "@/lib/session";
import { chunk } from "@/lib/utils";
import resultsContent from "@/content/results.json";

export const Route = createFileRoute("/ergebnis")({
  head: () => ({
    meta: [
      { title: "Ihre Auswertung – Versorgungskompass" },
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
/**
 * Lower PHQ-9 is better, which is easy to misread at a glance. Rather than a
 * subtle color tint on both directions (too easy to miss, and risks reading
 * amber-for-worse as a distress signal to patients), only an expected
 * improvement gets a visual highlight: a green-bordered box around the
 * output value itself (not the whole row). "Worse" and "no change" both
 * render identically, neutral — the sign (below, and the fixed "today"
 * line) still carries that information for anyone who needs it.
 */
function ComparisonRow({
  labelLines,
  description,
  scenario,
  baseline,
}: {
  labelLines: string[];
  description?: string | undefined;
  scenario: Scenario;
  baseline: number;
}) {
  const { tr } = useLang();
  const [low, high] = scenario.endpointRange;
  const improved = scenario.expectedEndpoint < baseline;
  const worsened = scenario.expectedEndpoint > baseline;
  const directionLabel = tr(improved ? r.legend.better : worsened ? r.legend.worse : r.legend.same);
  const textTone = improved ? "text-success" : "text-foreground";
  const dotTone = improved ? "border-success" : "border-primary";
  const barTone = improved ? "bg-success/35" : "bg-primary/35";
  return (
    <div className="py-3">
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-0.5 text-sm">
        <span className="font-medium">
          {labelLines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </span>
        <span
          className={`whitespace-nowrap text-right tabular-nums ${
            improved ? "rounded-md border-2 border-success bg-success-soft px-2 py-1" : ""
          }`}
        >
          <span className={`font-semibold ${textTone}`}>
            {scenario.expectedEndpoint}
            <span className="sr-only"> ({directionLabel})</span>
          </span>{" "}
          <span className="text-xs text-muted-foreground">
            ({low}–{high})
          </span>
        </span>
      </div>
      {description ? (
        <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="relative mt-2.5 h-4">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div
          className="absolute top-0 bottom-0 border-l-2 border-foreground/70"
          style={{ left: `${pct(baseline)}%` }}
        />
        <div
          className={`absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full ${barTone}`}
          style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
        />
        <div
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-card ${dotTone}`}
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
 * A short label that reveals a fuller explanation on hover/focus, used as
 * the exclusion-count column header in DisclaimerCard below instead of a
 * standalone sentence — a sentence sitting next to a column of numbers is
 * easy to skim past, so the "what does this number mean" explanation moves
 * into a tooltip anchored right on the header those numbers sit under.
 * Opens on hover *and* keyboard focus (not just :hover) so it's reachable
 * without a mouse.
 */
function InfoTooltip({ label, description }: { label: string; description: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="cursor-help whitespace-nowrap border-b border-dotted border-muted-foreground/60 text-xs font-medium text-muted-foreground"
        aria-describedby={tooltipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute right-0 top-full z-10 mt-1.5 w-56 rounded-md border border-border bg-card p-2.5 text-xs leading-relaxed text-foreground shadow-md"
        >
          {description}
        </span>
      )}
    </span>
  );
}

/**
 * The trial-eligibility disclaimer, now placed above the results in reading
 * order rather than beside them in a sidebar. Sitting first doesn't mean
 * gating: only the heading and one-sentence intro show by default, so the
 * note registers at a glance without making the reader clear a wall of text
 * before reaching their results. The exclusion criteria and closing line —
 * the part worth reading closely if it applies to you — stay a tap away
 * behind "show details", collapsed the same way the posterior distribution
 * below is (see the showDistributions toggle in Results).
 *
 * Each criterion is a short topic label with an optional smaller-font
 * description underneath, not a full sentence — and the "N of 12 studies
 * excluded them" clause, which used to repeat verbatim on every line, is now
 * a column header (countHeader) sitting directly above the fractions it
 * describes, via InfoTooltip, rather than a sentence people can skim past.
 */
function DisclaimerCard() {
  const { tr } = useLang();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-md border border-warning/30 bg-warning-soft p-4">
      <h2 className="text-sm font-semibold">{tr(r.prototypeNote.heading)}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {tr(r.prototypeNote.intro)}
      </p>
      {expanded && (
        <>
          <div className="mt-3 flex justify-end">
            <InfoTooltip
              label={tr(r.prototypeNote.countHeader)}
              description={tr(r.prototypeNote.countNote)}
            />
          </div>
          <dl className="mt-1 divide-y divide-warning/20 text-sm">
            {r.prototypeNote.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-2">
                <dt>
                  <span className="font-medium">{tr(item.label)}</span>
                  {"description" in item ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {tr(item.description)}
                    </span>
                  ) : null}
                </dt>
                <dd className="shrink-0 whitespace-nowrap pt-0.5 text-xs tabular-nums text-muted-foreground">
                  {item.excludedIn}/{r.prototypeNote.totalStudies}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm font-medium leading-relaxed">{tr(r.prototypeNote.closing)}</p>
        </>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-medium text-primary underline underline-offset-2"
      >
        {tr(expanded ? r.prototypeNote.hideDetails : r.prototypeNote.showDetails)}
      </button>
    </div>
  );
}

/** Legend for ComparisonRow — each swatch reuses the exact classes drawn in the chart. */
function ChartLegend() {
  const { tr } = useLang();
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 shrink-0 rounded-sm border-2 border-success bg-success-soft" />
        {tr(r.legend.better)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 shrink-0 rounded-full bg-muted-foreground/40" />
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

function Results() {
  const { tr } = useLang();
  const p = usePrediction();
  const [revealed, setRevealed] = useState(false);
  const [showDistributions, setShowDistributions] = useState(false);

  // buildPredictions() (inside usePrediction) always returns scenarios,
  // even before hydration/completion, so this is safe to compute here — it
  // must be, since hooks can't follow the early returns below. Only
  // actually binned while the panel is open (the common case is collapsed)
  // — see posteriorDomain()'s own comment for why the domain isn't just
  // 0–27.
  const activeScenarios = p.scenarios;
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

  /**
   * Same components as scenarioLabel, but as an array of lines instead of
   * one joined string, since ComparisonRow's grid layout renders each line
   * separately to keep the endpoint value pinned to the right regardless of
   * how long the label runs. Every scenario here has 0 or 1 component, so
   * this always returns a single-element array — this chunking logic
   * carries over from when packages could combine up to 4 components, but
   * is harmless (and correct) for today's single-component-only scenarios.
   */
  const scenarioLabelLines = (scenario: Scenario): string[] =>
    scenario.id === "usualCare"
      ? [tr(r.scenarios.usualCare.short)]
      : chunk(
          scenario.components.map((id) => tr(r.components[id].short)),
          2,
        ).map((group) => group.join(" + "));

  /** Every row is a single component added alone, so it always has one unambiguous explanation to show. */
  const scenarioDescription = (scenario: Scenario): string | undefined => {
    const [id] = scenario.components;
    return id !== undefined && scenario.components.length === 1
      ? tr(r.components[id].description)
      : undefined;
  };

  const round1 = (x: number) => Number(x.toFixed(1));
  const usualEndpoint =
    p.scenarios.find((s) => s.id === "usualCare")?.expectedEndpoint ?? p.baseline;

  const scenarioTableRows = (scenarios: Scenario[]) =>
    scenarios.map((scenario) => {
      const delta = round1(usualEndpoint - scenario.expectedEndpoint);
      return {
        label: scenarioLabel(scenario),
        endpoint: String(scenario.expectedEndpoint),
        range: `${scenario.endpointRange[0]}–${scenario.endpointRange[1]}`,
        delta: scenario.id === "usualCare" ? "–" : delta > 0 ? `-${delta}` : `+${-delta}`,
      };
    });

  const downloadPdf = () => {
    generateResultsPdf({
      filenamePrefix: tr({ de: "meine-auswertung", en: "my-results" }),
      title: tr(r.title),
      subtitle: tr(r.pdf.subtitle),
      baselineLabel: `${r.phq9Label} ${tr(r.of27)}`,
      baselineValue: `${p.baseline}/27`,
      severityValue: `${tr(SEVERITY_LABEL[p.severity])} · ${tr(r.range)} ${SEVERITY_RANGE[p.severity]}`,
      scenariosHeading: tr(r.whatCanBeExpected),
      scenariosBody: tr(r.whatCanBeExpectedBody),
      modelHeading: tr(r.whatCanBeExpected),
      tableHeaders: {
        careOption: tr(r.pdf.table.careOption),
        endpoint: tr(r.pdf.table.endpoint),
        delta: tr(r.pdf.table.delta),
      },
      scenarioTables: [
        { heading: tr(r.scenarioTabs.single), rows: scenarioTableRows(p.scenarios) },
      ],
      predictorsHeading: tr(r.whatInfluences),
      predictorsBody: tr(r.predictorsNote),
      predictorRows: [
        { label: tr(r.predictors.baseline.label), value: `${p.baseline}/27` },
        {
          label: tr(r.predictors.age.label),
          value: p.session.profile.birthDate
            ? ageFromBirthDate(p.session.profile.birthDate).toFixed(2)
            : tr(r.predictors.notProvided),
        },
        {
          label: tr(r.predictors.sex.label),
          value: p.session.profile.sex
            ? tr(
                SEX_OPTIONS.find((o) => o.value === p.session.profile.sex)?.label ?? {
                  de: "–",
                  en: "–",
                },
              )
            : tr(r.predictors.notProvided),
        },
      ],
      footer: tr(r.pdf.footer),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <DisclaimerCard />

      <div className="mt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{tr(r.title)}</h1>
          <button
            type="button"
            onClick={downloadPdf}
            className="rounded-md border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary print:hidden"
          >
            {tr(r.actions.downloadPdf)}
          </button>
        </div>

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

          <BaselinePointer baseline={p.baseline} />
          <div className="divide-y divide-border rounded-md border border-border px-4">
            {activeScenarios.map((scenario) => (
              <ComparisonRow
                key={scenario.id}
                labelLines={scenarioLabelLines(scenario)}
                description={scenarioDescription(scenario)}
                scenario={scenario}
                baseline={p.baseline}
              />
            ))}
          </div>
          <ChartLegend />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {tr(r.scenariosIntro)}
          </p>

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
