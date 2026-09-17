/**
 * Step-1 risk model — a proportional-odds mixed model (`ordinal::clmm`)
 * fitted on individual patient data across 12 studies, predicting the
 * 12-month PHQ-9 distribution from baseline PHQ-9, age and sex (no GAD-7 —
 * dropped as a predictor in this refit). Its output ("risk score") is the
 * single covariate the Step-2 component network meta-analysis
 * (src/lib/model.ts) uses to let each structured-care component's effect
 * vary with a patient's overall risk — see `delta_component_risk` there.
 *
 * Ported from `risk_score_model.R`'s fitted `model` list (see
 * model/step1_risk_score/export_risk_model_json.R).
 *
 * IMPORTANT — this is NOT that script's own `predict_phq9()`/`eta` value.
 * `eta` (the raw linear predictor, log-cumulative-odds scale, typically a
 * small number like -2..+3) is an intermediate quantity, not the "risk
 * score" the Step-2 CNMA was actually fit against (the manifest's
 * `risk_column: "expected_phq9_12mo"` — a real 0–27-scale PHQ-9 expected
 * value, same semantics as the previous `rms::orm`-based Step 1 model).
 * Feeding raw `eta` into Step 2 as `risk_score` was tried and produces
 * clinically implausible predictions (near-total remission regardless of
 * baseline severity — `lambda_risk * risk_score` is dominated by
 * `alpha_study` when `risk_score` is O(1) instead of O(10)); see the PR
 * this landed in for the smoke-test numbers that caught it. This module
 * instead reconstructs `expected_phq9_12mo` = E[Y] from `eta` via the
 * fitted ordinal thresholds, exactly the same E[Y]-over-the-full-
 * distribution approach the previous Step 1 model used:
 *
 *   eta = beta_y0c * y0_c + g(age_c) + beta_sexMale * (sex == "Male")
 *   y0_c  = (baseline_phq9 - y0_mu) / y0_sd
 *   age_c = (age - age_mu) / age_sd
 *   g(age_c) = the fitted natural cubic spline (splines::ns) contribution
 *              of centered age, with knots at ageKnots (2 boundary + 2
 *              interior, on the age_c scale)
 *   P(Y<=j) = logistic(threshold_j - eta)     -- ordinal package's own
 *                                                 parameterization (thresholds
 *                                                 MINUS eta, not plus)
 *   P(Y=j)  = P(Y<=j) - P(Y<=j-1)    (P(Y<=-1) := 0, P(Y<=27) := 1)
 *   risk_score = E[Y] = sum_j( j * P(Y=j) )
 *
 * Verified this sign convention (not the reverse) against R directly: it's
 * the one that produces a risk score monotonically increasing with baseline
 * PHQ-9 across a realistic 3–18 range, matching `ordinal::clmm`'s
 * documented `logit(P(Y<=j)) = theta_j - eta` parameterization.
 *
 * WHY g() is reconstructed from just 4 numbers, not ns()'s own basis:
 * g(age_c) is a fixed linear combination of natural-cubic-spline basis
 * functions, so it is itself exactly a natural cubic spline in age_c with
 * knots at ageKnots — fully determined by its own value at those 4 knots
 * (`gAtAgeKnots` in risk-model.json) plus the natural boundary condition
 * (zero second derivative, i.e. linear extrapolation) beyond the outer two.
 * `naturalSpline` below reconstructs exactly that, via the standard
 * Numerical-Recipes-style natural cubic spline (tridiagonal solve for the
 * second derivatives, then per-interval cubic interpolation / per-side
 * linear extrapolation). This was verified against R's actual
 * `ns(...) %*% beta` output across a wide grid of ages — including outside
 * the training range, to check the linear extrapolation — to
 * floating-point-noise-level agreement (~1e-14).
 *
 * `risk_score` is then clamped to the range Step 2 was trained on (see
 * RISK_SCORE_TRAINING below), since the Step-2 posterior gives no
 * information outside that range.
 */

import riskModelData from "./data/risk-model.json";
import type { Sex } from "./session";

/**
 * TODO(risk-score-training-range): the exact range to clamp to is the
 * min/max of `risk_score` across the same training rows Step 2 was fit on
 * — that requires per-patient data this repo deliberately never receives
 * (see model/step1_risk_score/README.md), so it has to be computed once
 * outside this repo and reported back as two numbers. Until then, this
 * reuses the *previous* model's training range as an interim approximation
 * (not a real bound for this refit): both models' risk scores are now on
 * the same E[Y]-of-12-month-PHQ-9 scale, and this refit's own E[Y] at
 * baseline PHQ-9 extremes (~3 at PHQ-9=0, ~18 at PHQ-9=27) lines up closely
 * with this range, so it's a reasonable placeholder — but confirm the real
 * number before treating predictions near these bounds as reliable.
 */
export const RISK_SCORE_TRAINING = {
  min: 2.21116203598618,
  max: 17.9887400340882,
};

const COEF = riskModelData.coefficients;
const AGE_KNOTS = riskModelData.ageKnots;
const G_AT_AGE_KNOTS = riskModelData.gAtAgeKnots;
const SCALING = riskModelData.scaling;

/** rms/clmm only fitted Female/Male; other Sex values fall back to Female (the reference level, dummy = 0). */
const RISK_SEX_CODE: Partial<Record<Sex, "Female" | "Male">> = {
  female: "Female",
  male: "Male",
};

/**
 * Natural cubic spline through n (x, y) points: exact cubic interpolation
 * between knots, exact linear extrapolation beyond the outer two (the
 * "natural" boundary condition — zero second derivative at both ends).
 * Standard tridiagonal-solve construction (e.g. Numerical Recipes' `spline`
 * + `splint`), specialized here for the fixed small knot set risk-model.json
 * carries (4 points) but not hardcoded to that count.
 */
function naturalSpline(x: readonly number[], y: readonly number[]): (xv: number) => number {
  const n = x.length;
  const y2 = new Array<number>(n).fill(0);
  const u = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const xPrev = x[i - 1]!;
    const xCur = x[i]!;
    const xNext = x[i + 1]!;
    const sig = (xCur - xPrev) / (xNext - xPrev);
    const p = sig * y2[i - 1]! + 2;
    y2[i] = (sig - 1) / p;
    let ui = (y[i + 1]! - y[i]!) / (xNext - xCur) - (y[i]! - y[i - 1]!) / (xCur - xPrev);
    ui = (6 * ui) / (xNext - xPrev) - sig * u[i - 1]!;
    u[i] = ui / p;
  }
  for (let k = n - 2; k >= 0; k--) {
    y2[k] = y2[k]! * y2[k + 1]! + u[k]!;
  }

  return (xv: number): number => {
    const x0 = x[0]!;
    const xLast = x[n - 1]!;
    if (xv < x0) {
      const h = x[1]! - x0;
      const deriv0 = (y[1]! - y[0]!) / h - (h * y2[1]!) / 6; // y2[0] = 0
      return y[0]! + deriv0 * (xv - x0);
    }
    if (xv > xLast) {
      const h = xLast - x[n - 2]!;
      const derivLast = (y[n - 1]! - y[n - 2]!) / h + (h * y2[n - 2]!) / 6; // y2[n-1] = 0
      return y[n - 1]! + derivLast * (xv - xLast);
    }
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (hi + lo) >> 1;
      if (x[mid]! > xv) hi = mid;
      else lo = mid;
    }
    const h = x[hi]! - x[lo]!;
    const a = (x[hi]! - xv) / h;
    const b = (xv - x[lo]!) / h;
    return (
      a * y[lo]! + b * y[hi]! + (((a ** 3 - a) * y2[lo]! + (b ** 3 - b) * y2[hi]!) * (h * h)) / 6
    );
  };
}

const ageSpline = naturalSpline(AGE_KNOTS, G_AT_AGE_KNOTS);

/** yLevels is 0..27 in risk-model.json; THRESHOLD_KEYS are their "j|j+1" cutpoint names, in level order. */
const THRESHOLD_KEYS = riskModelData.yLevels
  .slice(0, -1)
  .map((j) => `${j}|${j + 1}`) as (keyof typeof riskModelData.thresholds)[];

export type RiskScoreInput = {
  age: number | null;
  sex: Sex | null;
  baselinePhq9: number;
};

/** Population-typical age used when birth date is unknown (the fitted model's own mean age). */
export const DEFAULT_AGE = SCALING.ageMu;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** The model's linear predictor (log-cumulative-odds scale), before the ordinal-thresholds transform to an expected PHQ-9 value. */
function computeEta(input: RiskScoreInput): number {
  const age = input.age ?? DEFAULT_AGE;
  const sexLabel = input.sex ? (RISK_SEX_CODE[input.sex] ?? "Female") : "Female";

  const y0c = (input.baselinePhq9 - SCALING.y0Mu) / SCALING.y0Sd;
  const ageC = (age - SCALING.ageMu) / SCALING.ageSd;
  const sexMale = sexLabel === "Male" ? 1 : 0;

  return COEF.y0_c * y0c + ageSpline(ageC) + COEF.sexMale * sexMale;
}

/**
 * Computes the Step-1 risk score (E[12-month PHQ-9] under usual care, before
 * any structured-care component is added) for one patient, clamped to the
 * Step-2 model's training range. See file header for why this is a
 * thresholds-transform of `eta`, not `eta` itself.
 */
export function computeRiskScore(input: RiskScoreInput): number {
  const eta = computeEta(input);

  // ordinal::clmm's own parameterization: logit(P(Y<=j)) = threshold_j - eta.
  let cumBelow = 0; // P(Y <= level-1), starts at P(Y <= -1) = 0
  let mean = 0;
  for (let level = 0; level < riskModelData.yLevels.length; level++) {
    const key = THRESHOLD_KEYS[level];
    const cumAt = key !== undefined ? sigmoid(riskModelData.thresholds[key] - eta) : 1; // P(Y<=27) = 1
    mean += level * (cumAt - cumBelow);
    cumBelow = cumAt;
  }

  return clamp(mean, RISK_SCORE_TRAINING.min, RISK_SCORE_TRAINING.max);
}
