import type { ReactNode } from "react";
import type { Scenario } from "@/lib/model";
import { severityFor, type Severity } from "@/lib/phq9";
import { PHQ9_MAX } from "@/components/OutcomeStrip";

const pct = (x: number) => (Math.min(PHQ9_MAX, Math.max(0, x)) / PHQ9_MAX) * 100;

/**
 * PHQ-9 severity bands as they sit on the continuous 0–27 axis. Scores are
 * integers, so each boundary falls halfway between two bands' ranges
 * (0–4 | 5–9 | …), which keeps every band exactly as wide as its range.
 */
const BANDS: { id: Severity; from: number; to: number; shade: string }[] = [
  { id: "minimal", from: 0, to: 4.5, shade: "bg-foreground/[0.015]" },
  { id: "mild", from: 4.5, to: 9.5, shade: "bg-foreground/[0.04]" },
  { id: "moderate", from: 9.5, to: 14.5, shade: "bg-foreground/[0.065]" },
  { id: "moderatelySevere", from: 14.5, to: 19.5, shade: "bg-foreground/[0.09]" },
  { id: "severe", from: 19.5, to: PHQ9_MAX, shade: "bg-foreground/[0.115]" },
];

export type OutcomeChartLabels = {
  /** Short band names shown along the top of the chart. */
  bands: Record<Severity, string>;
  /** Full severity names, for the hover text and screen readers. */
  severity: Record<Severity, string>;
  /** "{band}" is replaced with the full severity name of the row's expected outcome. */
  mostLikely: string;
  today: string;
  fewer: string;
  more: string;
  legend: { helpful: string; other: string; usualCare: string; range: string; today: string };
};

/**
 * All care options on one shared chart: usual care first, then the single
 * components in the order given. Each row shows a soft band for the range
 * the 12-month PHQ-9 is expected to fall in, and a dot at its centre. It
 * shows no numbers. Instead the axis is shaded into the five PHQ-9 severity
 * bands, so a row reads as "people like you tended to end up around
 * 'moderate'" rather than as a precise score.
 *
 * The range is drawn as a gradient that fades towards its ends, so the
 * uncertainty is the main visual and overlap between options is easy to
 * see. The patient's score today is one line through every row.
 *
 * The drawing is aria-hidden. Each row carries a screen-reader sentence
 * with the same information in words.
 */
export function OutcomeChart({
  usualCare,
  scenarios,
  baseline,
  label,
  helpful,
  labels,
}: {
  usualCare: Scenario;
  scenarios: Scenario[];
  baseline: number;
  label: (scenario: Scenario) => string;
  helpful: (scenario: Scenario) => boolean;
  labels: OutcomeChartLabels;
}) {
  const mostLikely = (s: Scenario) =>
    labels.mostLikely.replace("{band}", labels.severity[severityFor(s.expectedEndpoint)]);

  return (
    <div>
      <div className="rounded-md border border-border bg-card px-3 py-3 sm:px-4">
        {/* Band names along the top, aligned with the track column. */}
        <Row labelSlot={null}>
          <div aria-hidden className="relative h-7 text-[10px] leading-tight text-muted-foreground">
            {BANDS.map((b) => (
              <span
                key={b.id}
                className="absolute bottom-1 px-0.5 text-center"
                style={{ left: `${pct(b.from)}%`, width: `${pct(b.to) - pct(b.from)}%` }}
              >
                {labels.bands[b.id]}
              </span>
            ))}
          </div>
        </Row>

        <ul>
          {[usualCare, ...scenarios].map((s, i) => {
            const isUsualCare = s.id === usualCare.id;
            return (
              <li
                key={s.id}
                className={isUsualCare ? "border-b border-dashed border-border pb-1 mb-1" : ""}
              >
                <Row
                  labelSlot={
                    <span
                      className={`text-sm leading-snug ${isUsualCare ? "italic text-muted-foreground" : ""}`}
                    >
                      {label(s)}
                    </span>
                  }
                >
                  <span className="sr-only">
                    {label(s)}: {mostLikely(s)}
                  </span>
                  <Track
                    scenario={s}
                    baseline={baseline}
                    tone={isUsualCare ? "usual" : helpful(s) ? "helpful" : "other"}
                    hover={mostLikely(s)}
                    showTodayTag={i === 0}
                    todayLabel={labels.today}
                  />
                </Row>
              </li>
            );
          })}
        </ul>

        <Row labelSlot={null}>
          <div
            aria-hidden
            className="mt-1.5 flex justify-between gap-3 text-[11px] text-muted-foreground"
          >
            <span>← {labels.fewer}</span>
            <span className="text-right">{labels.more} →</span>
          </div>
        </Row>
      </div>

      <Legend labels={labels.legend} />
    </div>
  );
}

/**
 * Label column + track column. Stacks on narrow screens, side by side from
 * `sm`. There, the track stretches to the row's full height, so a label that
 * wraps onto several lines doesn't leave gaps in the band shading.
 */
function Row({ labelSlot, children }: { labelSlot: ReactNode; children: ReactNode }) {
  return (
    <div className="sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <div className={labelSlot ? "pt-2 sm:self-center sm:py-1.5" : "hidden sm:block"}>
        {labelSlot}
      </div>
      <div className="min-w-0 sm:flex sm:flex-col">{children}</div>
    </div>
  );
}

const TONES = {
  helpful: { dot: "bg-success", band: "via-success/45" },
  other: { dot: "bg-primary", band: "via-primary/35" },
  usual: { dot: "bg-muted-foreground", band: "via-muted-foreground/40" },
} as const;

function Track({
  scenario,
  baseline,
  tone,
  hover,
  showTodayTag,
  todayLabel,
}: {
  scenario: Scenario;
  baseline: number;
  tone: keyof typeof TONES;
  hover: string;
  showTodayTag: boolean;
  todayLabel: string;
}) {
  const [low, high] = scenario.endpointRange;
  const t = TONES[tone];
  return (
    <div aria-hidden className="group relative h-8 sm:h-auto sm:min-h-8 sm:flex-1">
      {/* Severity band shading. Rows sit flush, so the shading reads as continuous columns. */}
      {BANDS.map((b) => (
        <div
          key={b.id}
          className={`absolute inset-y-0 ${b.shade}`}
          style={{ left: `${pct(b.from)}%`, width: `${pct(b.to) - pct(b.from)}%` }}
        />
      ))}

      {/* Today: one line running through every row. */}
      <div
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground/60"
        style={{ left: `${pct(baseline)}%` }}
      />
      {showTodayTag ? (
        <span
          className="absolute -top-0.5 ml-1.5 text-[10px] font-medium text-foreground/80"
          style={{ left: `${pct(baseline)}%` }}
        >
          {todayLabel}
        </span>
      ) : null}

      {/* Expected range: fades out towards both ends, so it reads as "likely somewhere in here". */}
      <div
        className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-linear-to-r from-transparent to-transparent ${t.band}`}
        style={{ left: `${pct(low)}%`, width: `${Math.max(pct(high) - pct(low), 2)}%` }}
      />
      <div
        className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${t.dot}`}
        style={{ left: `${pct(scenario.expectedEndpoint)}%` }}
      />

      <span
        style={{ left: `${pct(scenario.expectedEndpoint)}%` }}
        className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
      >
        {hover}
      </span>
    </div>
  );
}

function Legend({ labels }: { labels: OutcomeChartLabels["legend"] }) {
  const item = (swatch: ReactNode, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {text}
    </span>
  );
  const dot = (cls: string) => <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      {item(dot("bg-success"), labels.helpful)}
      {item(dot("bg-primary"), labels.other)}
      {item(dot("bg-muted-foreground"), labels.usualCare)}
      {item(
        <span className="h-2.5 w-6 shrink-0 rounded-full bg-linear-to-r from-transparent via-foreground/35 to-transparent" />,
        labels.range,
      )}
      {item(<span className="h-3 w-0 shrink-0 border-l-2 border-foreground/60" />, labels.today)}
    </div>
  );
}
