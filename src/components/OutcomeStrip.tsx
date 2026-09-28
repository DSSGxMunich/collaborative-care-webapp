import type { ReactNode } from "react";
import type { Scenario } from "@/lib/model";

/**
 * Every strip, pointer and axis on /ergebnis and /praxis shares the full
 * PHQ-9 range (0–27), never a zoomed one: a zoomed axis would make small
 * differences between components look bigger than they are, and a
 * per-page or per-row axis would stop the rows being comparable.
 */
export const PHQ9_MAX = 27;
const pct = (x: number) => (Math.min(PHQ9_MAX, Math.max(0, x)) / PHQ9_MAX) * 100;

/**
 * Lower PHQ-9 is better. Only an expected improvement on today gets color
 * (green); worse or unchanged stays neutral, so a patient isn't shown a
 * warning color for an option that simply doesn't help.
 */
const tone = (improved: boolean) =>
  improved
    ? { dot: "border-success", bar: "bg-success/35" }
    : { dot: "border-primary", bar: "bg-primary/35" };

/**
 * One row's forest-plot-style strip: a dot at the expected 12-month PHQ-9,
 * a bar for its 95% credible interval, and a vertical line at the patient's
 * PHQ-9 today. It shows no numbers itself. Whether numbers appear is up to
 * the caller (patients: none, GPs: shown next to the label).
 *
 * The bar has end caps because some intervals (usual care especially) are
 * narrower than the dot. Without caps, the dot would hide the whole bar.
 *
 * Nothing on the strip is labelled on the page. Hovering near the today
 * line shows `todayLabel`, and hovering the dot shows `expectedLabel`. Each
 * uses a hit area larger than the mark itself so it is easy to find. The
 * tooltips are visual only, since the strip is aria-hidden.
 */
export function OutcomeStrip({
  scenario,
  baseline,
  todayLabel,
  expectedLabel,
  reference = false,
}: {
  scenario: Scenario;
  baseline: number;
  todayLabel: string;
  expectedLabel: string;
  /** Usual care, the comparison: never gets the green "likely to help" tone. */
  reference?: boolean;
}) {
  const [low, high] = scenario.endpointRange;
  const t = tone(!reference && scenario.expectedEndpoint < baseline);
  const cap = `absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${t.bar}`;
  return (
    <div aria-hidden className="relative h-4">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      <div
        className={`absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full ${t.bar}`}
        style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
      />
      <div className={cap} style={{ left: `${pct(low)}%` }} />
      <div className={cap} style={{ left: `${pct(high)}%` }} />
      <div
        className="group absolute -top-1 -bottom-1 z-10 flex w-4 -translate-x-1/2 justify-center"
        style={{ left: `${pct(baseline)}%` }}
      >
        <span className="h-full w-0.5 bg-foreground/70 group-hover:bg-foreground" />
        <HoverTip>{todayLabel}</HoverTip>
      </div>
      {/* After the today line in the DOM, so the dot wins where the two overlap. */}
      <div
        className="group absolute top-1/2 z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: `${pct(scenario.expectedEndpoint)}%` }}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full border-2 bg-card transition-transform group-hover:scale-125 ${t.dot}`}
        />
        <HoverTip>{expectedLabel}</HoverTip>
      </div>
    </div>
  );
}

/** Tooltip above its `group` parent, shown only while the parent is hovered. */
function HoverTip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
      {children}
    </span>
  );
}

/**
 * The shared 0–27 axis under the list. `ticks` puts numbers on it (GP
 * page); without them, the two ends are labelled in words instead
 * (patient page), so the direction is still clear with no numbers shown.
 */
export function ScaleAxis({
  ticks,
  lowLabel,
  highLabel,
}: {
  ticks?: number[] | undefined;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div aria-hidden className="text-[11px] text-muted-foreground">
      <div className="relative h-2 border-t border-border">
        {ticks?.map((t) => (
          <span
            key={t}
            className="absolute top-0 h-1.5 w-px bg-border"
            style={{ left: `${pct(t)}%` }}
          />
        ))}
      </div>
      {ticks ? (
        <div className="relative h-4 tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-0.5 flex justify-between gap-3">
        <span>← {lowLabel}</span>
        <span className="text-right">{highLabel} →</span>
      </div>
    </div>
  );
}

export type OutcomeLegendLabels = {
  expected: string;
  helpful: string;
  interval: string;
  today: string;
  scale: string;
};

/** Legend for OutcomeStrip. Each swatch uses the same classes as the strip itself. */
export function OutcomeLegend({ labels }: { labels: OutcomeLegendLabels }) {
  const item = (swatch: ReactNode, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {text}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
      {item(
        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-card" />,
        labels.expected,
      )}
      {item(
        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-success bg-card" />,
        labels.helpful,
      )}
      {item(<span className="h-0.5 w-4 shrink-0 rounded-full bg-primary/35" />, labels.interval)}
      {item(<span className="h-3 w-0 shrink-0 border-l-2 border-foreground/70" />, labels.today)}
      {item(null, labels.scale)}
    </div>
  );
}
