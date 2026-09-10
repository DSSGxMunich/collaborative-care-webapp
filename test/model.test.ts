/**
 * Regression tests for the step-1 treatment model (src/lib/model.ts).
 *
 * These pin known input -> output pairs so that an edit to
 * src/lib/data/treatmentModel.coefficients.json, src/lib/stats.ts, or the
 * model's math in model.ts fails loudly here instead of silently changing
 * predictions shown to patients. If a fix is intentional (a re-fit, a bug
 * fix in the math), regenerate these fixtures deliberately — don't just
 * paste in new numbers to make the test pass.
 */
import { describe, expect, test } from "bun:test";
import { buildPredictions, predictScenario, type PredictionInput } from "../src/lib/model";
import { emptySession } from "../src/lib/session";

function inputFor(
  baseline: number,
  ageBand: PredictionInput["profile"]["ageBand"],
  sex: PredictionInput["profile"]["sex"],
): PredictionInput {
  return {
    baseline,
    functioning: null,
    profile: { ...emptySession().profile, ageBand, sex },
  };
}

describe("model.ts — treatment model regression fixtures", () => {
  test("usual care, unknown age/sex", () => {
    const scenario = predictScenario(inputFor(15, null, null), [], "usualCare");
    expect(scenario.expectedEndpoint).toBeCloseTo(11.3, 1);
    expect(scenario.endpointRange).toEqual([11.2, 11.3]);
    expect(scenario.responseProbability).toBeCloseTo(0.22, 2);
    expect(scenario.remissionProbability).toBeCloseTo(0.1, 2);
  });

  test("combined components, known age band and sex", () => {
    const scenario = predictScenario(
      inputFor(15, "50-64", "female"),
      ["followUp", "relapsePrevention"],
      "combined",
    );
    expect(scenario.expectedEndpoint).toBeCloseTo(9.9, 1);
    expect(scenario.endpointRange).toEqual([8.2, 11.6]);
    expect(scenario.responseProbability).toBeCloseTo(0.311, 2);
    expect(scenario.remissionProbability).toBeCloseTo(0.158, 2);
  });

  test("single component, low baseline", () => {
    const scenario = predictScenario(inputFor(8, "18-29", "male"), ["followUp"], "followUp");
    expect(scenario.expectedEndpoint).toBeCloseTo(6.8, 1);
    expect(scenario.expectedDrop).toBeCloseTo(1.2, 1);
  });

  test("buildPredictions: usual care is never more favourable than the model's own pick", () => {
    const predictions = buildPredictions(inputFor(15, "50-64", "female"));
    expect(predictions.favourable.scenario.expectedEndpoint).toBeLessThanOrEqual(
      predictions.usual.expectedEndpoint,
    );
    expect(predictions.configurations).toHaveLength(4);
  });

  test("probabilities always stay within [0, 1]", () => {
    for (const baseline of [0, 5, 15, 27]) {
      const scenario = predictScenario(inputFor(baseline, "65+", "male"), ["relapsePrevention"]);
      expect(scenario.responseProbability).toBeGreaterThanOrEqual(0);
      expect(scenario.responseProbability).toBeLessThanOrEqual(1);
      expect(scenario.remissionProbability).toBeGreaterThanOrEqual(0);
      expect(scenario.remissionProbability).toBeLessThanOrEqual(1);
      expect(scenario.expectedEndpoint).toBeGreaterThanOrEqual(0);
      expect(scenario.expectedEndpoint).toBeLessThanOrEqual(27);
    }
  });
});
