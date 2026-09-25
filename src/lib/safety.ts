import type { L } from "./i18n";
import { severityFor } from "./phq9";
import type { Session } from "./session";

/**
 * Risk level from the P4 Screener's own answer mechanism (Dube, Kroenke,
 * Bair, Theobald & Williams, 2010, Prim Care Companion J Clin Psychiatry
 * 12(6)) — classified purely from the four P4 answers (past/plan/
 * probability/preventive), independent of PHQ-9. As with the rest of this
 * file's P4 adaptation (see session.tsx), the exact "minimal/lower/higher"
 * thresholds here are this app's implementation of that scheme as
 * specified during development, not independently re-verified against the
 * original paper's PDF (network access to the primary source was blocked
 * this session) — flag for review against the source paper.
 */
export type RiskLevel = "minimal" | "lower" | "higher";

export function assessRisk(s: Session): RiskLevel {
  const { past, plan, probability, preventive } = s.safety;

  // "Higher": probability of acting is anything but "not at all likely", or
  // there are no preventive/protective factors.
  if ((probability !== null && probability !== 0) || preventive === "no") return "higher";
  // "Lower": a past attempt/self-harm episode or having thought about a
  // method, with no higher-tier signal above.
  if (past === "yes" || plan === "yes") return "lower";
  // "Minimal": no to past and plan, "not at all likely" on probability, and
  // yes to having a preventive factor.
  return "minimal";
}

const REASON: Record<
  "probabilityVery" | "probabilitySomewhat" | "noPreventive" | "plan" | "past",
  L
> = {
  probabilityVery: {
    de: "Sie haben angegeben, dass Sie es für sehr wahrscheinlich halten, diese Gedanken in die Tat umzusetzen.",
    en: "You indicated it is very likely you will act on these thoughts.",
  },
  probabilitySomewhat: {
    de: "Sie haben angegeben, dass Sie es für einigermaßen wahrscheinlich halten, diese Gedanken in die Tat umzusetzen.",
    en: "You indicated it is somewhat likely you will act on these thoughts.",
  },
  noPreventive: {
    de: "Sie haben angegeben, dass Sie nichts davon abhalten würde, sich selbst zu verletzen.",
    en: "You indicated nothing would prevent you from harming yourself.",
  },
  plan: {
    de: "Sie haben angegeben, darüber nachgedacht zu haben, wie Sie sich verletzen könnten.",
    en: "You indicated having thought about how you might hurt yourself.",
  },
  past: {
    de: "Sie haben angegeben, sich in der Vergangenheit selbst verletzt oder einen Suizidversuch unternommen zu haben.",
    en: "You indicated having harmed yourself or attempted suicide in the past.",
  },
};

/** Explains *why* assessRisk landed on "lower"/"higher", in priority order. */
export function riskReasons(s: Session): L[] {
  const { past, plan, probability, preventive } = s.safety;
  const reasons: L[] = [];
  if (probability === 2) reasons.push(REASON.probabilityVery);
  else if (probability === 1) reasons.push(REASON.probabilitySomewhat);
  if (preventive === "no") reasons.push(REASON.noPreventive);
  if (plan === "yes") reasons.push(REASON.plan);
  if (past === "yes") reasons.push(REASON.past);
  return reasons;
}

/**
 * Level shown as the crisis message on the results page. Layers two
 * signals deliberately: the explicit P4 risk (assessRisk) always takes
 * priority when it fires above "minimal" — it is the more specific and
 * sensitive signal — and PHQ-9 severity alone (see phq9.ts) provides a
 * softer "advisory" tier for moderate-to-severe symptoms with an otherwise
 * minimal P4 result.
 */
export type CrisisLevel = RiskLevel | "advisory";

export function crisisLevel(s: Session, baseline: number): CrisisLevel {
  const risk = assessRisk(s);
  if (risk !== "minimal") return risk;
  const severity = severityFor(baseline);
  return severity === "severe" || severity === "moderatelySevere" ? "advisory" : "minimal";
}
