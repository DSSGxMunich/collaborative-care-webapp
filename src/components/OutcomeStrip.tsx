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
 */
export function OutcomeStrip({ scenario, baseline }: { scenario: Scenario; baseline: number }) {
  const [low, high] = scenario.endpointRange;
  const t = tone(scenario.expectedEndpoint < baseline);
  return (
    <div aria-hidden className="relative h-4">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      <div
        className="absolute top-0 bottom-0 border-l-2 border-foreground/70"
        style={{ left: `${pct(baseline)}%` }}
      />
      <div
        className={`absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full ${t.bar}`}
        style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
      />
      <div
        className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-card ${t.dot}`}
        style={{ left: `${pct(scenario.expectedEndpoint)}%` }}
      />
    </div>
  );
}

/** Label with a short tick pointing at today's position, sitting above the first strip. */
export function TodayPointer({ baseline, label }: { baseline: number; label: string }) {
  // Clamped so a label near 0 or 27 doesn't run off the track's edge.
  const left = Math.min(90, Math.max(10, pct(baseline)));
  return (
    <div aria-hidden className="relative h-8">
      <span
        className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-foreground"
        style={{ left: `${left}%` }}
      >
        {label}
      </span>
      <span
        className="absolute bottom-0 h-2.5 w-0.5 -translate-x-1/2 bg-foreground/70"
        style={{ left: `${pct(baseline)}%` }}
      />
    </div>
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
