import { severityFor } from "./phq9";
import type { Session } from "./session";

/**
 * Risk level driven purely by the three explicit safety questions plus
 * PHQ-9 item 9 ("thoughts that you would be better off dead..."). This is
 * the risk-score half of the model: safety-question risk score. It is
 * deliberately independent of PHQ-9 total severity.
 */
export type RiskLevel = "none" | "low" | "elevated" | "acute";

export function assessRisk(s: Session): RiskLevel {
  const item9 = s.phq[8] ?? 0;
  const { plan, canStaySafe, pastAttempt } = s.safety;

  if (plan === "yes" || canStaySafe === "no") return "acute";
  if (item9 >= 2 || (item9 >= 1 && pastAttempt === "yes")) return "elevated";
  if (item9 >= 1) return "low";
  return "none";
}

/**
 * Level shown as the crisis message on the results page. Layers two
 * signals deliberately: the explicit safety-question risk (assessRisk)
 * always takes priority when it fires — it is the more specific and
 * sensitive signal — and PHQ-9 severity alone (see phq9.ts) provides a
 * softer "advisory" tier for moderate-to-severe symptoms with no positive
 * safety answers, per the requirement that the crisis message reflect
 * PHQ-9 severity.
 */
export type CrisisLevel = RiskLevel | "advisory";

export function crisisLevel(s: Session, baseline: number): CrisisLevel {
  const risk = assessRisk(s);
  if (risk !== "none") return risk;
  const severity = severityFor(baseline);
  return severity === "severe" || severity === "moderatelySevere" ? "advisory" : "none";
}
