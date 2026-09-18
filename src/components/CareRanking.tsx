import type { Scenario } from "@/lib/model";

/**
 * Shows care options as an ordered list — rank only, no PHQ-9 point
 * estimates or credible intervals. Two audiences (patients on /ergebnis,
 * GPs on /praxis) asked for the same thing after testing: the raw numbers
 * (e.g. "9.2 (7.1–11.4)") read as more precise than the model actually is,
 * and are harder to act on than a plain "this tends to help more" order.
 * Usual care stays a separate reference block, outside the numbered list,
 * since it isn't itself "ranked" against the other components.
 */
export function CareRanking({
  usualCare,
  ranked,
  labelLines,
  description,
  helpful,
  usualCareHeading,
  usualCareDescription,
  helpfulBadge,
  rankAriaLabel,
  compact = false,
}: {
  usualCare: Scenario;
  ranked: Scenario[];
  labelLines: (scenario: Scenario) => string[];
  description: (scenario: Scenario) => string | undefined;
  helpful: (scenario: Scenario) => boolean;
  usualCareHeading: string;
  /** What "usual care" itself means. */
  usualCareDescription?: string;
  helpfulBadge: string;
  rankAriaLabel: (rank: number, total: number) => string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="rounded-md border border-border bg-secondary/50 p-3.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {usualCareHeading}
        </p>
        <p className="mt-1 text-sm font-medium">{labelLines(usualCare).join(" ")}</p>
        {usualCareDescription ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {usualCareDescription}
          </p>
        ) : null}
      </div>

      <ol className="mt-4 divide-y divide-border rounded-md border border-border">
        {ranked.map((scenario, index) => {
          const rank = index + 1;
          const desc = description(scenario);
          const isHelpful = helpful(scenario);
          return (
            <li
              key={scenario.id}
              className={`flex items-start gap-3 ${compact ? "p-2.5" : "p-3.5"}`}
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold tabular-nums"
              >
                {rank}
              </span>
              <div className="min-w-0 flex-1">
                <span className="sr-only">{rankAriaLabel(rank, ranked.length)}</span>
                <p className="text-sm font-medium leading-snug">
                  {labelLines(scenario).map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </p>
                {desc ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                ) : null}
              </div>
              {isHelpful ? (
                <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-md border-2 border-success bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                  {helpfulBadge}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
