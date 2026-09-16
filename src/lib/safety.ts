import type { L } from "./i18n";
import { severityFor } from "./phq9";
import type { Session } from "./session";

/**
 * Risk level driven by the P4-based safety questions plus PHQ-9 item 9
 * ("thoughts that you would be better off dead..."). This is the
 * risk-score half of the model: safety-question risk score. It is
 * deliberately independent of PHQ-9 total severity.
 *
 * The four safety questions (past/plan/probability/preventive) follow the
 * P4 Screener (Dube, Kroenke, Bair, Theobald & Williams, 2010, Prim Care
 * Companion J Clin Psychiatry 12(6)) — a brief suicide-risk screener
 * validated in 2 RCTs of primary-care/oncology patients (past attempt,
 * plan, self-rated probability of acting, and preventive/protective
 * factors). A German translation was separately validated against the
 * SBQ-R (Schluessel et al. 2023, J Clin Med, LMU Munich).
 *
 * IMPORTANT: the acute/elevated/low thresholds below are this app's own
 * adaptation for an automated triage banner, not Dube et al.'s published
 * risk-classification rule — this session could not independently verify
 * the original paper's exact "minimal/lower/higher risk" algorithm
 * (network access to the primary sources was blocked), so the mapping from
 * P4 answers to a RiskLevel here should be checked against the source
 * paper before being relied on as equivalent to the validated instrument's
 * own scoring.
 */
export type RiskLevel = "none" | "low" | "elevated" | "acute";

export function assessRisk(s: Session): RiskLevel {
  const item9 = s.phq[8] ?? 0;
  const { plan, probability, past, preventive } = s.safety;

  if (probability === 2) return "acute";
  if (
    item9 >= 2 ||
    (item9 >= 1 && past === "yes") ||
    plan === "yes" ||
    probability === 1 ||
    preventive === "no"
  )
    return "elevated";
  if (item9 >= 1) return "low";
  return "none";
}

const REASON: Record<
  | "probabilityVery"
  | "plan"
  | "probabilitySomewhat"
  | "noPreventive"
  | "item9High"
  | "item9AndPast",
  L
> = {
  probabilityVery: {
    de: "Sie haben angegeben, dass Sie es für sehr wahrscheinlich halten, diese Gedanken in die Tat umzusetzen.",
    en: "You indicated it is very likely you will act on these thoughts.",
  },
  plan: {
    de: "Sie haben angegeben, darüber nachgedacht zu haben, wie Sie sich verletzen könnten.",
    en: "You indicated having thought about how you might hurt yourself.",
  },
  probabilitySomewhat: {
    de: "Sie haben angegeben, dass Sie es für einigermaßen wahrscheinlich halten, diese Gedanken in die Tat umzusetzen.",
    en: "You indicated it is somewhat likely you will act on these thoughts.",
  },
  noPreventive: {
    de: "Sie haben angegeben, dass Sie nichts davon abhalten würde, sich selbst zu verletzen.",
    en: "You indicated nothing would prevent you from harming yourself.",
  },
  item9High: {
    de: "Sie haben bei der PHQ-9-Frage zu Gedanken an Tod/Selbstverletzung „an mehr als der Hälfte der Tage“ oder „beinahe jeden Tag“ angegeben.",
    en: "You answered the PHQ-9 question on thoughts of death/self-harm with “more than half the days” or “nearly every day”.",
  },
  item9AndPast: {
    de: "Sie haben bei der PHQ-9-Frage zu Gedanken an Tod/Selbstverletzung mit „ja“ geantwortet und eine frühere Selbstverletzung/einen Versuch angegeben.",
    en: "You answered yes to the PHQ-9 question on thoughts of death/self-harm and reported a past self-harm episode or attempt.",
  },
};

/**
 * Explains *why* assessRisk fired acute/elevated, so the safety-step banner
 * never appears unexplained.
 */
export function riskReasons(s: Session): L[] {
  const item9 = s.phq[8] ?? 0;
  const { plan, probability, past, preventive } = s.safety;
  const reasons: L[] = [];
  if (probability === 2) reasons.push(REASON.probabilityVery);
  if (plan === "yes") reasons.push(REASON.plan);
  if (probability === 1) reasons.push(REASON.probabilitySomewhat);
  if (preventive === "no") reasons.push(REASON.noPreventive);
  if (item9 >= 2) reasons.push(REASON.item9High);
  else if (item9 >= 1 && past === "yes") reasons.push(REASON.item9AndPast);
  return reasons;
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
