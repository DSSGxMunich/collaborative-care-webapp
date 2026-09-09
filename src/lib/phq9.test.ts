import { describe, expect, test } from "bun:test";
import { PHQ9_MAX, PHQ9_MIN, parsePhq9Score, phq9Total } from "./phq9";

describe("parsePhq9Score — format", () => {
  test("accepts a plain integer", () => {
    expect(parsePhq9Score("14")).toEqual({ valid: true, value: 14 });
  });

  test("trims surrounding whitespace", () => {
    expect(parsePhq9Score("  9  ")).toEqual({ valid: true, value: 9 });
  });

  test("accepts a leading + sign", () => {
    expect(parsePhq9Score("+5")).toEqual({ valid: true, value: 5 });
  });

  test("rejects decimals as a format error, not a range error", () => {
    expect(parsePhq9Score("5.5")).toEqual({ valid: false, reason: "not-integer" });
    expect(parsePhq9Score("12,0")).toEqual({ valid: false, reason: "not-a-number" });
  });

  test("rejects non-numeric text", () => {
    expect(parsePhq9Score("abc")).toEqual({ valid: false, reason: "not-a-number" });
    expect(parsePhq9Score("NaN")).toEqual({ valid: false, reason: "not-a-number" });
    expect(parsePhq9Score("5 6")).toEqual({ valid: false, reason: "not-a-number" });
  });

  test("rejects empty or whitespace-only input", () => {
    expect(parsePhq9Score("")).toEqual({ valid: false, reason: "empty" });
    expect(parsePhq9Score("   ")).toEqual({ valid: false, reason: "empty" });
  });
});

describe("parsePhq9Score — range", () => {
  test("accepts the boundaries of the PHQ-9 scale (0 and 27)", () => {
    expect(parsePhq9Score("0")).toEqual({ valid: true, value: 0 });
    expect(parsePhq9Score("27")).toEqual({ valid: true, value: 27 });
  });

  test("rejects values below the minimum", () => {
    expect(parsePhq9Score("-1")).toEqual({ valid: false, reason: "out-of-range" });
  });

  test("rejects values above the maximum", () => {
    expect(parsePhq9Score("28")).toEqual({ valid: false, reason: "out-of-range" });
    expect(parsePhq9Score("100")).toEqual({ valid: false, reason: "out-of-range" });
  });

  test("PHQ9_MIN/PHQ9_MAX match the 9-item, 0-3-per-item scale", () => {
    expect(PHQ9_MIN).toBe(0);
    expect(PHQ9_MAX).toBe(27);
  });
});

describe("phq9Total", () => {
  test("sums answered items", () => {
    expect(phq9Total([0, 1, 2, 3, 0, 1, 2, 3, 0])).toBe(12);
  });

  test("treats unanswered (null) items as 0", () => {
    expect(phq9Total([3, 3, 3, null, null, null, null, null, null])).toBe(9);
  });

  test("the maximum possible total matches PHQ9_MAX", () => {
    expect(phq9Total(Array(9).fill(3))).toBe(PHQ9_MAX);
  });
});
