import type { L } from "./i18n";
import type { Session } from "./session";

export type RiskLevel = "none" | "low" | "elevated" | "acute";

export function assessRisk(s: Session): RiskLevel {
  const item9 = s.phq[8] ?? 0;
  const { plan, canStaySafe, pastAttempt } = s.safety;

  if (plan === "yes" || canStaySafe === "no") return "acute";
  if (item9 >= 2 || (item9 >= 1 && pastAttempt === "yes")) return "elevated";
  if (item9 >= 1) return "low";
  return "none";
}

export const RISK_TITLE: Record<RiskLevel, L> = {
  none: ["Keine Hinweise auf akute Gefährdung", "No indication of acute risk"],
  low: ["Bitte lesen: Hinweise zu belastenden Gedanken", "Please read: about distressing thoughts"],
  elevated: ["Bitte holen Sie sich zeitnah Unterstützung", "Please seek support soon"],
  acute: ["Bitte holen Sie sich jetzt Hilfe", "Please get help now"],
};

export const RISK_MESSAGE: Record<RiskLevel, L> = {
  none: [
    "Ihre Angaben enthalten keine Hinweise auf akute Selbstgefährdung. Sprechen Sie dennoch alles an, was Sie belastet.",
    "Your answers show no signs of acute risk to yourself. Still, do raise anything that is weighing on you.",
  ],
  low: [
    "Sie haben angegeben, dass Sie an einzelnen Tagen Gedanken hatten, lieber tot zu sein oder sich Leid zuzufügen. Solche Gedanken sind bei Depressionen häufig und behandelbar. Bitte sprechen Sie sie bei Ihrem nächsten Termin an – und melden Sie sich früher, wenn sie stärker werden.",
    "You reported that on some days you had thoughts of being better off dead or of hurting yourself. Such thoughts are common in depression and can be treated. Please mention them at your next appointment — and get in touch sooner if they get stronger.",
  ],
  elevated: [
    "Ihre Angaben deuten auf häufigere Gedanken an Selbstverletzung oder Tod hin. Bitte kontaktieren Sie heute oder morgen Ihre Praxis, den ärztlichen Bereitschaftsdienst (116 117) oder die Telefonseelsorge. Sie müssen damit nicht allein bleiben.",
    "Your answers suggest more frequent thoughts of self-harm or death. Please contact your practice, the out-of-hours service (116 117) or a crisis line today or tomorrow. You do not have to deal with this alone.",
  ],
  acute: [
    "Ihre Angaben weisen auf eine akute Gefährdung hin. Bitte holen Sie sich jetzt Hilfe: Rufen Sie 112 an, gehen Sie in die nächste psychiatrische Klinik oder wenden Sie sich an die Telefonseelsorge (0800 111 0 111). Bleiben Sie möglichst nicht allein und sagen Sie einer Person in Ihrer Nähe, wie es Ihnen geht.",
    "Your answers indicate acute risk. Please get help now: call 112, go to the nearest psychiatric emergency department, or call a crisis line (0800 111 0 111). If possible, do not stay alone and tell someone nearby how you are feeling.",
  ],
};
