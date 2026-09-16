import type { L } from "./i18n";
import { severityFor } from "./phq9";
import type { Session } from "./session";

/**
 * Risk level driven purely by the three explicit safety questions plus
 * PHQ-9 item 9 ("thoughts that you would be better off dead..."). This is
 * the risk-score half of the model: safety-question risk score. It is
 * deliberately independent of PHQ-9 total severity.
 *
 * The three questions themselves follow the German NVL/S3-Leitlinie
 * Unipolare Depression's suicidality staging (Empfehlung 12-3, Tabelle
 * 41/42, konsensbasiert): "plan" mirrors Stufe 3 ("konkrete Suizidpläne
 * oder -vorbereitungen"), "canStaySafe" reflects "Distanzierung von
 * suizidalem Verhalten"/"Absprachefähigkeit", and "pastAttempt" reflects
 * the "Suizidversuch(e) in der Anamnese" risk factor. The guideline is
 * explicit that these factors are a clinical decision aid, not a
 * validated diagnostic checklist ("keine Checkliste zur validen Diagnose
 * des Suizidrisikos") — the yes/no rule logic below is a deliberate
 * simplification of that guidance for an automated triage banner, not a
 * clinically validated scoring algorithm, and should be read as such by
 * anyone extending it.
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

const REASON: Record<"plan" | "canStaySafe" | "item9High" | "item9AndPastAttempt", L> = {
  plan: {
    de: "Sie haben angegeben, einen Plan oder Vorbereitungen zu haben.",
    en: "You indicated having a plan or preparations.",
  },
  canStaySafe: {
    de: "Sie haben angegeben, sich bis zum nächsten Kontakt nicht sicher fühlen zu können.",
    en: "You indicated not feeling able to stay safe until your next contact.",
  },
  item9High: {
    de: "Sie haben bei der PHQ-9-Frage zu Gedanken an Tod/Selbstverletzung „an mehr als der Hälfte der Tage“ oder „beinahe jeden Tag“ angegeben.",
    en: "You answered the PHQ-9 question on thoughts of death/self-harm with “more than half the days” or “nearly every day”.",
  },
  item9AndPastAttempt: {
    de: "Sie haben bei der PHQ-9-Frage zu Gedanken an Tod/Selbstverletzung mit „ja“ geantwortet und eine frühere Selbstverletzung/einen Versuch angegeben.",
    en: "You answered yes to the PHQ-9 question on thoughts of death/self-harm and reported a past self-harm episode or attempt.",
  },
};

/**
 * Explains *why* assessRisk fired acute/elevated, so the safety-step banner
 * never appears unexplained — e.g. answering "No" to all three safety
 * questions can still trigger it, because "No" to "do you feel able to
 * keep yourself safe" is itself the concerning answer, and PHQ-9 item 9
 * alone (independent of the three safety questions) can also trigger it.
 */
export function riskReasons(s: Session): L[] {
  const item9 = s.phq[8] ?? 0;
  const { plan, canStaySafe, pastAttempt } = s.safety;
  const reasons: L[] = [];
  if (plan === "yes") reasons.push(REASON.plan);
  if (canStaySafe === "no") reasons.push(REASON.canStaySafe);
  if (item9 >= 2) reasons.push(REASON.item9High);
  else if (item9 >= 1 && pastAttempt === "yes") reasons.push(REASON.item9AndPastAttempt);
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
