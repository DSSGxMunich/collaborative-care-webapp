/**
 * Step-1 risk model — ordinal regression (rms::orm) fitted on individual
 * patient data, predicting the 12-month PHQ-9 distribution from baseline
 * characteristics. Its output ("risk_score") is the single covariate the
 * Step-2 component network meta-analysis (src/lib/model.ts) uses to let
 * each structured-care component's effect vary with a patient's overall
 * risk — see `delta_component_risk` there.
 *
 * Ported from `orm_predictions.json` (coefficients, restricted-cubic-spline
 * knots for age / baseline_phq9 / gad7_total, and 20 cumulative-logit
 * intercepts y>=1 .. y>=20). Validated against the 3 worked examples in
 * that file (age/sex/baseline_phq9/gad7_total -> linear_predictor,
 * mean_phq9, prob_distribution) to within the ~1e-3 rounding of the
 * supplied 4-decimal coefficients.
 *
 * Model:
 *   xbeta   = sum of RCS(age) + RCS(baseline_phq9) + RCS(gad7_total) terms
 *             + sex=Male dummy (Female is the reference level)
 *   P(Y>=j) = logistic(alpha_j + xbeta)               for each level j
 *   P(Y=j)  = P(Y>=j) - P(Y>=j+1)  (P(Y=0) = 1 - P(Y>=1), P(Y=max) = P(Y>=max))
 *   risk_score = E[Y] = sum_j( j * P(Y=j) )            -- "mean_phq9" in the
 *                                                          source predictions
 *
 * `risk_score` is then clamped to the [training_min, training_max] range
 * the Step-2 model was fitted on (see RISK_SCORE_TRAINING below), since the
 * Step-2 posterior gives no information outside that range.
 *
 * Restricted cubic splines: rms fits each continuous predictor with 4
 * knots -> 3 columns (the variable itself, plus 2 nonlinear terms, named
 * "x", "x'", "x''" in the coefficient table). The nonlinear terms use
 * Harrell's standard rcspline.eval basis (norm=2, i.e. divided by
 * (t_k - t_1)^2) — see `rcsTerms` below.
 */

import riskModelData from "./data/risk-model.json";
import type { Sex } from "./session";

export const RISK_SCORE_TRAINING = {
  min: 2.21116203598618,
  max: 17.9887400340882,
};

type Coefficients = Record<string, number>;
const COEF = riskModelData.coefficients as Coefficients;
const KNOTS = riskModelData.knots;
const Y_LEVELS = riskModelData.yLevels;
const INTERCEPT_REF = riskModelData.interceptRef;

/** rms only fitted Female/Male; other Sex values fall back to Female (the reference level, dummy = 0). */
const RISK_SEX_CODE: Partial<Record<Sex, "Female" | "Male">> = {
  female: "Female",
  male: "Male",
};

/**
 * Harrell's restricted-cubic-spline basis for one predictor: the variable
 * itself plus (knots.length - 2) nonlinear terms, matching how rms names
 * and orders them ("x", "x'", "x''", ... for k knots -> k-1 columns).
 */
function rcsTerms(x: number, knots: readonly number[]): number[] {
  const k = knots.length;
  const t1 = knots[0]!;
  const tk1 = knots[k - 2]!;
  const tk = knots[k - 1]!;
  const pos3 = (v: number) => (v > 0 ? v ** 3 : 0);
  const terms = [x];
  for (let j = 0; j < k - 2; j++) {
    const tj = knots[j]!;
    const term =
      (pos3(x - tj) -
        (pos3(x - tk1) * (tk - tj)) / (tk - tk1) +
        (pos3(x - tk) * (tk1 - tj)) / (tk - tk1)) /
      (tk - t1) ** 2;
    terms.push(term);
  }
  return terms;
}

function addRcsTerms(
  sum: number,
  x: number,
  knots: readonly number[],
  names: readonly string[],
): number {
  const terms = rcsTerms(x, knots);
  return terms.reduce((acc, v, i) => acc + (COEF[names[i]!] ?? 0) * v, sum);
}

export type RiskScoreInput = {
  age: number | null;
  sex: Sex | null;
  baselinePhq9: number;
  /** GAD-7 total (0-21), or null if unknown — see DEFAULT_GAD7_TOTAL fallback. */
  gad7Total: number | null;
};

/**
 * Population-typical GAD-7 total used when the patient doesn't know their
 * score (it's an optional question — see session.tsx). Approximated as the
 * midpoint of the two central knots ([1, 5, 9, 19] -> 7), in the absence of
 * the training-sample mean; this is a documented approximation, not a
 * fitted value.
 */
export const DEFAULT_GAD7_TOTAL = 7;

/** Population-typical age used when birth date is unknown (mid-knot, see DEFAULT_GAD7_TOTAL). */
export const DEFAULT_AGE = 45;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** The model's linear predictor (excluding any intercept) for one patient. */
function computeXBeta(input: RiskScoreInput): number {
  const age = input.age ?? DEFAULT_AGE;
  const gad7 = input.gad7Total ?? DEFAULT_GAD7_TOTAL;
  const sexLabel = input.sex ? (RISK_SEX_CODE[input.sex] ?? "Female") : "Female";

  let xbeta = 0;
  xbeta = addRcsTerms(xbeta, age, KNOTS.age, ["age", "age'", "age''"]);
  xbeta = addRcsTerms(xbeta, input.baselinePhq9, KNOTS.baseline_phq9, [
    "baseline_phq9",
    "baseline_phq9'",
    "baseline_phq9''",
  ]);
  xbeta = addRcsTerms(xbeta, gad7, KNOTS.gad7_total, ["gad7_total", "gad7_total'", "gad7_total''"]);
  if (sexLabel === "Male") xbeta += COEF["sex=Male"] ?? 0;
  return xbeta;
}

/**
 * Computes the Step-1 risk score (E[12-month PHQ-9] under usual care,
 * before any structured-care component is added) for one patient, clamped
 * to the Step-2 model's training range.
 */
export function computeRiskScore(input: RiskScoreInput): number {
  const xbeta = computeXBeta(input);

  const cumProb = new Map<number, number>();
  for (let j = 1; j <= 20; j++) {
    cumProb.set(j, sigmoid((COEF[`y>=${j}`] ?? 0) + xbeta));
  }

  let mean = 0;
  for (const level of Y_LEVELS) {
    const pAbove = cumProb.get(level) ?? 1; // P(Y>=level), P(Y>=0) = 1
    const pAboveNext = cumProb.get(level + 1) ?? 0; // P(Y>=level+1), 0 past the top level
    const p = pAbove - pAboveNext;
    mean += level * p;
  }

  return clamp(mean, RISK_SCORE_TRAINING.min, RISK_SCORE_TRAINING.max);
}

/** Exposed for tests/debugging: the linear predictor at the reference intercept (rms predict(type="lp")). */
export function computeReferenceLinearPredictor(input: RiskScoreInput): number {
  return (COEF[`y>=${INTERCEPT_REF}`] ?? 0) + computeXBeta(input);
}
