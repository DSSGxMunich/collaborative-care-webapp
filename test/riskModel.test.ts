/**
 * Regression tests for the step-2 risk-score model (src/lib/riskModel.ts).
 *
 * These pin known input -> output pairs so that an edit to
 * src/lib/data/riskModel.coefficients.json, src/lib/stats.ts, or the spline/
 * cumulative-logit math in riskModel.ts fails loudly here instead of
 * silently changing predictions shown to patients. If a fix is intentional
 * (a re-fit, a bug fix in the math), regenerate these fixtures
 * deliberately — don't just paste in new numbers to make the test pass.
 */
import { describe, expect, test } from "bun:test";
import { predictRiskModel, RISK_MAX_Y, type RiskModelInput } from "../src/lib/riskModel";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("riskModel.ts — risk-score model regression fixtures", () => {
  test("young, low-severity patient with GAD-7 provided", () => {
    const input: RiskModelInput = {
      ageBand: "18-29",
      sex: "female",
      baselinePhq9: 5,
      gad7Total: 2,
    };
    const out = predictRiskModel(input);
    expect(out.riskScore).toBeCloseTo(5.6, 1);
    expect(out.medianPhq12mo).toBe(5);
    expect(out.remissionProbability12mo).toBeCloseTo(0.586, 2);
    expect(out.responseProbability12mo).toBeCloseTo(0.222, 2);
    expect(out.gad7Imputed).toBe(false);
  });

  test("older, moderate-severity patient", () => {
    const input: RiskModelInput = {
      ageBand: "50-64",
      sex: "male",
      baselinePhq9: 15,
      gad7Total: 10,
    };
    const out = predictRiskModel(input);
    expect(out.riskScore).toBeCloseTo(8.9, 1);
    expect(out.medianPhq12mo).toBe(8);
  });

  test("skipped GAD-7 falls back to the imputed value and flags gad7Imputed", () => {
    const input: RiskModelInput = {
      ageBand: "30-49",
      sex: "male",
      baselinePhq9: 20,
      gad7Total: null,
    };
    const out = predictRiskModel(input);
    expect(out.riskScore).toBeCloseTo(11.6, 1);
    expect(out.gad7Imputed).toBe(true);
  });

  test("category probabilities always sum to 1 and stay non-negative", () => {
    const cases: RiskModelInput[] = [
      { ageBand: "18-29", sex: "female", baselinePhq9: 0, gad7Total: 0 },
      { ageBand: "65+", sex: "male", baselinePhq9: 27, gad7Total: 21 },
      { ageBand: "30-49", sex: "female", baselinePhq9: 15, gad7Total: null },
    ];
    for (const input of cases) {
      const out = predictRiskModel(input);
      expect(out.categoryProbabilities).toHaveLength(RISK_MAX_Y + 1);
      expect(sum(out.categoryProbabilities)).toBeCloseTo(1, 6);
      for (const p of out.categoryProbabilities) {
        expect(p).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("risk score rises with baseline severity, all else equal", () => {
    const low = predictRiskModel({
      ageBand: "50-64",
      sex: "female",
      baselinePhq9: 5,
      gad7Total: 5,
    });
    const high = predictRiskModel({
      ageBand: "50-64",
      sex: "female",
      baselinePhq9: 25,
      gad7Total: 18,
    });
    expect(high.riskScore).toBeGreaterThan(low.riskScore);
  });
});
