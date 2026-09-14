import questionnaireContent from "@/content/questionnaire.json";
import type { L } from "./i18n";
import { PHQ9_OPTIONS } from "./phq9";
import type { Profile } from "./session";

const { gad7 } = questionnaireContent;

export const GAD7_INTRO: L = gad7.intro;
export const GAD7_ITEMS: L[] = gad7.items;
// GAD-7 items use the same 4-point "days bothered" scale as the PHQ-9.
export const GAD7_OPTIONS = PHQ9_OPTIONS;

/** Sum of the 7 GAD-7 item answers, or null while any item is still unanswered. */
export const gad7Total = (answers: (number | null)[]): number | null =>
  answers.length === 7 && answers.every((a) => a !== null)
    ? answers.reduce<number>((sum, a) => sum + (a ?? 0), 0)
    : null;

/**
 * The GAD-7 total to feed the model/reports: the manually entered score when
 * the patient said they know it, otherwise the total from the in-app
 * mini-questionnaire once fully answered (see gad7FillNow in session.tsx) —
 * or null if neither is available, in which case a population-typical
 * default is used (see DEFAULT_GAD7_TOTAL in riskScore.ts).
 */
export function effectiveGad7Score(profile: Profile): number | null {
  if (profile.gad7Known === "yes") return profile.gad7Score;
  return gad7Total(profile.gad7Answers);
}
