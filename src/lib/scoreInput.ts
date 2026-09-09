/**
 * Shared validator for a directly-entered whole-number questionnaire score
 * (used by both the "I already know my GAD-7 score" and "I already know my
 * PHQ-9 score" inputs — see gad7.ts / phq9.ts for the domain-specific range
 * and error messages). Checks format first — a plain integer literal,
 * optionally signed, no decimals / thousands separators / exponents /
 * embedded whitespace — then range, reporting the two as distinct reasons so
 * callers can show a precise message.
 */
export type ScoreInvalidReason = "empty" | "not-a-number" | "not-integer" | "out-of-range";

export type ScoreValidation =
  { valid: true; value: number } | { valid: false; reason: ScoreInvalidReason };

export function parseIntegerScore(raw: string, min: number, max: number): ScoreValidation {
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
  if (value < min || value > max) return { valid: false, reason: "out-of-range" };
  return { valid: true, value };
}
