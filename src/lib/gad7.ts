import type { L } from "./i18n";

/** GAD-7 uses the same 4-point response scale and recall period as the PHQ-9. */
export { PHQ9_OPTIONS as GAD7_OPTIONS } from "./phq9";

export const GAD7_INTRO: L = [
  "Wie oft haben Sie sich in den letzten zwei Wochen durch die folgenden Beschwerden beeinträchtigt gefühlt?",
  "Over the last two weeks, how often have you been bothered by any of the following problems?",
];

export const GAD7_ITEMS: L[] = [
  ["Nervosität, Ängstlichkeit oder Anspannung", "Feeling nervous, anxious, or on edge"],
  [
    "Nicht in der Lage sein, Sorgen zu stoppen oder zu kontrollieren",
    "Not being able to stop or control worrying",
  ],
  [
    "Übermäßige Sorgen bezüglich verschiedener Angelegenheiten",
    "Worrying too much about different things",
  ],
  ["Schwierigkeiten, sich zu entspannen", "Trouble relaxing"],
  ["So ruhelos, dass Stillsitzen schwerfällt", "Being so restless that it is hard to sit still"],
  ["Schnell verärgert oder gereizt sein", "Becoming easily annoyed or irritable"],
  [
    "Angst, als ob etwas Schlimmes passieren könnte",
    "Feeling afraid, as if something awful might happen",
  ],
];

export const gad7Total = (answers: (number | null)[]) =>
  answers.slice(0, 7).reduce<number>((sum, a) => sum + (a ?? 0), 0);

/** Valid range of a GAD-7 total score: 7 items, each scored 0-3. */
export const GAD7_MIN = 0;
export const GAD7_MAX = 21;

export type Gad7ScoreInvalidReason = "empty" | "not-a-number" | "not-integer" | "out-of-range";

export type Gad7ScoreValidation =
  { valid: true; value: number } | { valid: false; reason: Gad7ScoreInvalidReason };

/** Human-readable message for each way a directly-entered GAD-7 score can fail validation. */
export const GAD7_SCORE_ERROR: Record<Gad7ScoreInvalidReason, L> = {
  empty: ["", ""],
  "not-a-number": ["Bitte eine Zahl eingeben.", "Please enter a number."],
  "not-integer": [
    "Bitte eine ganze Zahl ohne Kommastellen eingeben.",
    "Please enter a whole number, with no decimals.",
  ],
  "out-of-range": [
    `Bitte einen Wert zwischen ${GAD7_MIN} und ${GAD7_MAX} eingeben.`,
    `Please enter a value between ${GAD7_MIN} and ${GAD7_MAX}.`,
  ],
};

/**
 * Validates a directly-entered GAD-7 total score (as opposed to one summed
 * from the 7 individual item answers). Checks format first (a plain integer,
 * optionally signed, no decimals/thousands separators/exponents), then range
 * (0-21) — the two are reported as distinct reasons so callers can show a
 * precise message.
 */
export function parseGad7Score(raw: string): Gad7ScoreValidation {
  const trimmed = raw.trim();
  if (trimmed === "") return { valid: false, reason: "empty" };

  if (!/^[+-]?\d+$/.test(trimmed)) {
    // Not a plain integer literal — distinguish "5.5" (a number, wrong
    // shape) from "abc" (not a number at all) for a clearer message.
    return {
      valid: false,
      reason: Number.isFinite(Number(trimmed)) ? "not-integer" : "not-a-number",
    };
  }

  const value = Number(trimmed);
  if (value < GAD7_MIN || value > GAD7_MAX) return { valid: false, reason: "out-of-range" };
  return { valid: true, value };
}
