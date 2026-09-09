import { describe, expect, test } from "bun:test";
import { GAD7_MAX, GAD7_MIN, gad7Total, parseGad7Score } from "./gad7";

describe("parseGad7Score — format", () => {
  test("accepts a plain integer", () => {
    expect(parseGad7Score("10")).toEqual({ valid: true, value: 10 });
  });

  test("trims surrounding whitespace", () => {
    expect(parseGad7Score("  7  ")).toEqual({ valid: true, value: 7 });
  });

  test("accepts a leading + sign", () => {
    expect(parseGad7Score("+5")).toEqual({ valid: true, value: 5 });
  });

  test("rejects decimals as a format error, not a range error", () => {
    expect(parseGad7Score("5.5")).toEqual({ valid: false, reason: "not-integer" });
    expect(parseGad7Score("12,0")).toEqual({ valid: false, reason: "not-a-number" });
  });

  test("rejects non-numeric text", () => {
    expect(parseGad7Score("abc")).toEqual({ valid: false, reason: "not-a-number" });
    expect(parseGad7Score("NaN")).toEqual({ valid: false, reason: "not-a-number" });
    expect(parseGad7Score("5 6")).toEqual({ valid: false, reason: "not-a-number" });
    // "1e2" is a finite JS number (100) in exponential notation, just not a
    // plain integer literal — same category as "5.5", not "abc".
    expect(parseGad7Score("1e2")).toEqual({ valid: false, reason: "not-integer" });
  });

  test("rejects empty or whitespace-only input", () => {
    expect(parseGad7Score("")).toEqual({ valid: false, reason: "empty" });
    expect(parseGad7Score("   ")).toEqual({ valid: false, reason: "empty" });
  });
});

describe("parseGad7Score — range", () => {
  test("accepts the boundaries of the GAD-7 scale (0 and 21)", () => {
    expect(parseGad7Score("0")).toEqual({ valid: true, value: 0 });
    expect(parseGad7Score("21")).toEqual({ valid: true, value: 21 });
  });

  test("rejects values below the minimum", () => {
    expect(parseGad7Score("-1")).toEqual({ valid: false, reason: "out-of-range" });
    expect(parseGad7Score("-100")).toEqual({ valid: false, reason: "out-of-range" });
  });

  test("rejects values above the maximum", () => {
    expect(parseGad7Score("22")).toEqual({ valid: false, reason: "out-of-range" });
    expect(parseGad7Score("100")).toEqual({ valid: false, reason: "out-of-range" });
  });

  test("GAD7_MIN/GAD7_MAX match the 7-item, 0-3-per-item scale", () => {
    expect(GAD7_MIN).toBe(0);
    expect(GAD7_MAX).toBe(21);
  });
});

describe("gad7Total", () => {
  test("sums answered items", () => {
    expect(gad7Total([0, 1, 2, 3, 0, 1, 2])).toBe(9);
  });

  test("treats unanswered (null) items as 0", () => {
    expect(gad7Total([3, 3, 3, null, null, null, null])).toBe(9);
  });

  test("the maximum possible total matches GAD7_MAX", () => {
    expect(gad7Total(Array(7).fill(3))).toBe(GAD7_MAX);
  });

  test("ignores items beyond the first 7", () => {
    expect(gad7Total([1, 1, 1, 1, 1, 1, 1, 99, 99])).toBe(7);
  });
});
