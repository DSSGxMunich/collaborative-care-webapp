import type { ReactNode } from "react";
import type { Scenario } from "@/lib/model";
import {
  OutcomeLegend,
  OutcomeStrip,
  ScaleAxis,
  type OutcomeLegendLabels,
} from "@/components/OutcomeStrip";

export type OutcomeDisplay = {
  /** The patient's PHQ-9 today — the reference line on every strip. */
  baseline: number;
  /** Shown on hover over any row's today line. */
  todayLabel: string;
  /** Shown on hover over a row's dot. */
  expectedLabel: (scenario: Scenario) => string;
  lowLabel: string;
  highLabel: string;
  /** Numbered axis ticks; omitted on the patient page, which shows no numbers. */
  ticks?: number[];
  legend: OutcomeLegendLabels;
  /** Numeric estimate shown beside each label (GP page only). */
  formatValue?: (scenario: Scenario) => string;
};

/**
 * Lines a strip, pointer or axis up with the rows' strips: same horizontal
 * padding, and an empty column the width of the rank badge (w-6 + gap-3),
 * so every 0–27 track starts and ends at the same x.
 */
function Track({ paddingX, children }: { paddingX: string; children: ReactNode }) {
  return (
    <div className={`flex gap-3 ${paddingX}`}>
      <span aria-hidden className="w-6 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Shows care options as an ordered list — rank only, no PHQ-9 point
 * estimates or credible intervals. Two audiences (patients on /ergebnis,
 * GPs on /praxis) asked for the same thing after testing: the raw numbers
 * (e.g. "9.2 (7.1–11.4)") read as more precise than the model actually is,
 * and are harder to act on than a plain "this tends to help more" order.
 * Usual care stays a separate reference block, outside the numbered list,
 * since it isn't itself "ranked" against the other components.
 *
 * "Likely to help" used to be a badge repeated on every row — with most or
 * all components clearing that bar, it stopped being a signal and became
 * text to read past 10 times. It's now said once, as a section header,
 * splitting the list at the point components stop beating usual care —
 * `ranked` is already sorted by expected outcome, so that split is a single
 * prefix, not a scattered subset.
 *
 * Below each label, an OutcomeStrip shows where that option is expected to
 * land on the shared 0–27 PHQ-9 scale relative to today, so the list shows
 * how far apart the options are, not just their order.
 */
export function CareRanking({
  usualCare,
  ranked,
  labelLines,
  description,
  helpful,
  usualCareDescription,
  helpfulSectionLabel,
  otherSectionLabel,
  rankAriaLabel,
  outcome,
  example,
  compact = false,
}: {
  /** Optional "example from a study" control rendered under each ranked row. */
  example?: (scenario: Scenario) => ReactNode;
  usualCare: Scenario;
  ranked: Scenario[];
  labelLines: (scenario: Scenario) => string[];
  description: (scenario: Scenario) => string | undefined;
  helpful: (scenario: Scenario) => boolean;
  /** What "usual care" itself means. */
  usualCareDescription?: string;
  helpfulSectionLabel: string;
  otherSectionLabel: string;
  rankAriaLabel: (rank: number, total: number) => string;
  outcome: OutcomeDisplay;
  compact?: boolean;
}) {
  const firstNotHelpful = ranked.findIndex((scenario) => !helpful(scenario));
  const splitIndex = firstNotHelpful === -1 ? ranked.length : firstNotHelpful;
  const rowPaddingX = compact ? "px-2.5" : "px-3.5";
  const rowPaddingY = compact ? "py-2.5" : "py-3.5";

  return (
    <div>
      <div className={`rounded-md border border-border bg-secondary/50 ${rowPaddingY}`}>
        <div className={rowPaddingX}>
          <LabelWithValue
            lines={[labelLines(usualCare).join(" ")]}
            value={outcome.formatValue?.(usualCare)}
          />
          {usualCareDescription ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {usualCareDescription}
            </p>
          ) : null}
        </div>
        <div className="mt-2.5">
          <Track paddingX={rowPaddingX}>
            <OutcomeStrip
              scenario={usualCare}
              baseline={outcome.baseline}
              todayLabel={outcome.todayLabel}
              expectedLabel={outcome.expectedLabel(usualCare)}
            />
          </Track>
        </div>
      </div>

      <ol className="mt-4 divide-y divide-border rounded-md border border-border">
        {ranked.map((scenario, index) => {
          const rank = index + 1;
          const desc = description(scenario);
          return (
            <li key={scenario.id}>
              {index === 0 && splitIndex > 0 ? (
                <p
                  className={`${rowPaddingX} bg-success-soft py-2 text-xs font-semibold uppercase tracking-wide text-success`}
                >
                  {helpfulSectionLabel}
                </p>
              ) : null}
              {index === splitIndex && splitIndex < ranked.length ? (
                <p
                  className={`${rowPaddingX} bg-secondary py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}
                >
                  {otherSectionLabel}
                </p>
              ) : null}
              <div className={`flex items-start gap-3 ${rowPaddingX} ${rowPaddingY}`}>
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold tabular-nums"
                >
                  {rank}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="sr-only">{rankAriaLabel(rank, ranked.length)}</span>
                  <LabelWithValue
                    lines={labelLines(scenario)}
                    value={outcome.formatValue?.(scenario)}
                  />
                  {desc ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  ) : null}
                  {example ? <div className="mt-1.5">{example(scenario)}</div> : null}
                  <div className="mt-2.5">
                    <OutcomeStrip
                      scenario={scenario}
                      baseline={outcome.baseline}
                      todayLabel={outcome.todayLabel}
                      expectedLabel={outcome.expectedLabel(scenario)}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-1.5 border-x border-transparent">
        <Track paddingX={rowPaddingX}>
          <ScaleAxis
            ticks={outcome.ticks}
            lowLabel={outcome.lowLabel}
            highLabel={outcome.highLabel}
          />
        </Track>
      </div>

      <div className="mt-4">
        <OutcomeLegend labels={outcome.legend} />
      </div>
    </div>
  );
}

/** Option label, with the numeric estimate pinned right when one is given (GP page). */
function LabelWithValue({
  lines,
  value,
  className = "",
}: {
  lines: string[];
  value?: string | undefined;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <p className="text-sm font-medium leading-snug">
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </p>
      {value ? (
        <span className="whitespace-nowrap text-right text-sm tabular-nums">{value}</span>
      ) : null}
    </div>
  );
}
