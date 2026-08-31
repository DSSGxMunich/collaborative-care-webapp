import type { L } from "./i18n";

export const PHQ9_OPTIONS: { value: 0 | 1 | 2 | 3; label: L; hint: L }[] = [
  { value: 0, label: ["Überhaupt nicht", "Not at all"], hint: ["0 Tage", "0 days"] },
  { value: 1, label: ["An einzelnen Tagen", "Several days"], hint: ["1–6 Tage", "1–6 days"] },
  {
    value: 2,
    label: ["An mehr als der Hälfte der Tage", "More than half the days"],
    hint: ["7–11 Tage", "7–11 days"],
  },
  { value: 3, label: ["Beinahe jeden Tag", "Nearly every day"], hint: ["12–14 Tage", "12–14 days"] },
];

export const PHQ9_INTRO: L = [
  "Wie oft haben Sie sich in den letzten zwei Wochen durch die folgenden Beschwerden beeinträchtigt gefühlt?",
  "Over the last two weeks, how often have you been bothered by any of the following problems?",
];

export const PHQ9_ITEMS: L[] = [
  ["Wenig Interesse oder Freude an Ihren Tätigkeiten", "Little interest or pleasure in doing things"],
  ["Niedergeschlagenheit, Melancholie oder Hoffnungslosigkeit", "Feeling down, depressed, or hopeless"],
  [
    "Schwierigkeiten ein- oder durchzuschlafen oder vermehrter Schlaf",
    "Trouble falling or staying asleep, or sleeping too much",
  ],
  ["Müdigkeit oder Gefühl, keine Energie zu haben", "Feeling tired or having little energy"],
  ["Verminderter Appetit oder übermäßiges Essen", "Poor appetite or overeating"],
  [
    "Schlechte Meinung von sich selbst; Gefühl, ein Versager zu sein oder die Familie enttäuscht zu haben",
    "Feeling bad about yourself, or that you are a failure or have let yourself or your family down",
  ],
  [
    "Schwierigkeiten, sich auf etwas zu konzentrieren, z. B. beim Lesen",
    "Trouble concentrating on things, such as reading",
  ],
  [
    "Waren Ihre Bewegungen oder Ihre Sprache verlangsamt? Oder waren Sie unruhig und zappelig?",
    "Moving or speaking slowly, or being so restless that you have been moving a lot more than usual",
  ],
  [
    "Gedanken, dass Sie lieber tot wären oder sich Leid zufügen möchten",
    "Thoughts that you would be better off dead or of hurting yourself in some way",
  ],
];

export const PHQ9_FUNCTION_ITEM: L = [
  "Wie stark beeinträchtigen diese Beschwerden Ihren Alltag (Arbeit, Haushalt, Beziehungen)?",
  "How much do these problems affect your daily life (work, home, relationships)?",
];

export const FUNCTION_OPTIONS: { value: 0 | 1 | 2 | 3; label: L }[] = [
  { value: 0, label: ["Überhaupt nicht", "Not at all"] },
  { value: 1, label: ["Etwas", "Somewhat"] },
  { value: 2, label: ["Deutlich", "Considerably"] },
  { value: 3, label: ["Sehr stark", "Extremely"] },
];

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
  minimal: ["Minimale Symptome", "Minimal symptoms"],
  mild: ["Leichte Symptome", "Mild symptoms"],
  moderate: ["Mittelgradige Symptome", "Moderate symptoms"],
  moderatelySevere: ["Mittelgradig bis schwere Symptome", "Moderately severe symptoms"],
  severe: ["Schwere Symptome", "Severe symptoms"],
};

export const SEVERITY_RANGE: Record<Severity, string> = {
  minimal: "0–4",
  mild: "5–9",
  moderate: "10–14",
  moderatelySevere: "15–19",
  severe: "20–27",
};

export const phq9Total = (answers: (number | null)[]) =>
  answers.slice(0, 9).reduce<number>((sum, a) => sum + (a ?? 0), 0);
