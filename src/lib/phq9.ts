import questionnaireContent from "@/content/questionnaire.json";
import type { L } from "./i18n";

const { phq9 } = questionnaireContent;

export const PHQ9_INTRO: L = phq9.intro;
export const PHQ9_ITEMS: L[] = phq9.items;
export const PHQ9_OPTIONS = phq9.options as { value: 0 | 1 | 2 | 3; label: L; hint: L }[];

export type Severity = "minimal" | "mild" | "moderate" | "moderatelySevere" | "severe";

export const severityFor = (score: number): Severity =>
  score >= 20
    ? "severe"
    : score >= 15
      ? "moderatelySevere"
      : score >= 10
        ? "moderate"
        : score >= 5
          ? "mild"
          : "minimal";

export const SEVERITY_LABEL: Record<Severity, L> = {
  minimal: phq9.severity.minimal.label,
  mild: phq9.severity.mild.label,
  moderate: phq9.severity.moderate.label,
  moderatelySevere: phq9.severity.moderatelySevere.label,
  severe: phq9.severity.severe.label,
};

export const SEVERITY_RANGE: Record<Severity, string> = {
  minimal: phq9.severity.minimal.range,
  mild: phq9.severity.mild.range,
  moderate: phq9.severity.moderate.range,
  moderatelySevere: phq9.severity.moderatelySevere.range,
  severe: phq9.severity.severe.range,
};

export const phq9Total = (answers: (number | null)[]) =>
  answers.slice(0, 9).reduce<number>((sum, a) => sum + (a ?? 0), 0);
