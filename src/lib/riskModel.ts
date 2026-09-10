/**
 * Step-2 risk-score model — 12-month PHQ-9 trajectory from patient characteristics.
 * ----------------------------------------------------------------------------
 * Source artifact: an `orm` object (package `rms`, Harrell) — a semiparametric
 * proportional-odds *ordinal* logistic regression predicting `phq9_12mo` from
 * `age`, `sex`, `baseline_phq9` and `gad7_total`, fit as:
 *
 *   orm(phq9_12mo ~ rcs(age, 4) + sex + rcs(baseline_phq9, 4) + rcs(gad7_total, 4))
 *
 * This file re-implements, in plain TS, what
 *   model <- readRDS("orm_fit.rds")
 *   predict(model, newdata = new_patients, type = "lp")
 * computes — plus the full per-category probability distribution (which a
 * single "lp" value alone does not give you), derived from all 20 fitted
 * cutpoint intercepts (`coefficients["y>=1"]` .. `coefficients["y>=20"]`).
 *
 * Model structure — proportional-odds cumulative logit:
 *
 *   logit( P(phq9_12mo >= j) ) = alpha_j + Xβ,   j = 1..20
 *
 * where alpha_j are RISK_INTERCEPTS (one per cutpoint — the ordinal outcome
 * has 21 observed categories, 0..20, hence 20 cutpoints) and Xβ is the *same*
 * linear combination for every cutpoint (the proportional-odds assumption),
 * built from restricted cubic spline (rcs, 4 knots each) terms for age,
 * baseline_phq9 and gad7_total, plus a sex=Male dummy (reference = Female).
 * See rcsBasis4() for the spline formula, and coefficient names below — each
 * rcs term contributes 3 columns to `coefficients`, named `x`, `x'`, `x''`.
 *
 * Feeding this step's parameters into "the next step": this is a *different*,
 * independent fitted model from the one in model.ts (the "step 1" treatment
 * model). It has no follow-up/relapse-prevention/care-configuration terms at
 * all — it exists purely to turn a patient's baseline characteristics into a
 * 12-month risk score (expected PHQ-9, plus response/remission probabilities
 * at 12 months), using the *same* profile inputs already collected for step 1
 * (age band, sex, baseline PHQ-9), extended with one new input (GAD-7 total).
 * usePrediction.ts computes this once step 1's inputs plus GAD-7 are known,
 * and ergebnis.tsx renders it as a distinct "Step 2" section.
 *
 * Caveats:
 * - The supplied model has no coefficient covariance matrix, so no valid
 *   uncertainty range can be derived — only a point estimate / category
 *   probabilities are exposed here, unlike the step-1 model's credible
 *   intervals.
 * - The training data's observed outcome range was 0–20 (21 distinct
 *   values), not the full 0–27 PHQ-9 scale used elsewhere in this app —
 *   predictions from this model cannot exceed 20.
 * - `age` is standardized here from the app's 4 age *bands* using the same
 *   representative midpoints as model.ts (AGE_MIDPOINT), not a continuous
 *   age — the model was fit on continuous age.
 * - When GAD-7 is skipped, GAD7_FALLBACK (the middle interior knot) is used
 *   as a placeholder, not a true sample mean — callers should surface
 *   `gad7Imputed` to the user.
 */

import { AGE_MIDPOINT, MODEL_META } from "./model";
import type { Profile, Sex } from "./session";

/** Four-knot locations per rcs() predictor, taken from Design$parms in the fitted model. */
const RISK_KNOTS = {
  age: [23, 45, 60, 73.33826294] as const,
  baselinePhq9: [2, 7, 11, 22] as const,
  gad7: [1, 5, 9, 19] as const,
};

/** Placeholder used only when GAD-7 was skipped — the middle interior knot (no sample mean available). */
export const GAD7_FALLBACK = RISK_KNOTS.gad7[1];

/** Slope coefficients (fitted point estimates), as supplied in `coefficients`. */
const SLOPES = {
  age: -0.035801363234228764,
  ageP: 0.038068551261718625,
  agePP: -0.07149492368167593,
  sexMale: 0.0005297401375515413,
  baselinePhq9: 0.23346784584327981,
  baselinePhq9P: -0.3533799014908819,
  baselinePhq9PP: 0.9981938253129752,
  gad7: 0.08667619132034193,
  gad7P: -0.20862581473991257,
  gad7PP: 0.4075475432880072,
};

/** Cumulative-logit intercepts alpha_j for P(phq9_12mo >= j), j = 1..20 (index 0 = "y>=1"). */
const RISK_INTERCEPTS: readonly number[] = [
  2.2660700028071985, 1.6259137340549574, 0.7956255691925868, 0.19877471442757505,
  -0.3240883189957678, -0.8050329434499239, -1.2307495117843854, -1.6047730161724143,
  -1.9722840310498178, -2.288912648885565, -2.5488193565092843, -2.7834754063501546,
  -3.0128715280694114, -3.2869257254159217, -3.5046365065890823, -3.7134102184442463,
  -3.9716275248674955, -4.268855460107572, -4.500158994607922, -4.759150827528097,
];

/** Highest ordinal category the fitted model can produce (training data only observed 0..20). */
export const RISK_MAX_Y = RISK_INTERCEPTS.length;

/**
 * Restricted cubic spline basis for a 4-knot rcs() term (Harrell's rms::rcs,
 * default norm=2: raw truncated-cubic terms divided by the squared outer-knot
 * span). Returns [x, term1, term2] matching the "x", "x'", "x''" columns rms
 * produces for a 4-knot spline.
 */
function rcsBasis4(
  x: number,
  knots: readonly [number, number, number, number],
): [number, number, number] {
  const [t1, t2, t3, t4] = knots;
  const cube = (u: number) => (u > 0 ? u * u * u : 0);
  const span2 = (t4 - t1) ** 2;
  const term = (tj: number) =>
    (cube(x - tj) -
      (cube(x - t3) * (t4 - tj)) / (t4 - t3) +
      (cube(x - t4) * (t3 - tj)) / (t4 - t3)) /
    span2;
  return [x, term(t1), term(t2)];
}

const plogis = (x: number) => 1 / (1 + Math.exp(-x));

export type RiskModelInput = {
  ageBand: NonNullable<Profile["ageBand"]>;
  sex: Sex;
  /** Baseline (intake) PHQ-9 total, 0-27 — same value used by model.ts. */
  baselinePhq9: number;
  /** GAD-7 total, 0-21, or null if the patient skipped that step. */
  gad7Total: number | null;
};

/** Xβ — the same linear combination used at every cutpoint (proportional-odds assumption). */
function linearPredictor(input: RiskModelInput): number {
  const age = AGE_MIDPOINT[input.ageBand];
  const gad7 = input.gad7Total ?? GAD7_FALLBACK;
  const [a, aP, aPP] = rcsBasis4(age, RISK_KNOTS.age);
  const [b, bP, bPP] = rcsBasis4(input.baselinePhq9, RISK_KNOTS.baselinePhq9);
  const [g, gP, gPP] = rcsBasis4(gad7, RISK_KNOTS.gad7);
  const sexMale = input.sex === "male" ? 1 : 0;
  return (
    SLOPES.age * a +
    SLOPES.ageP * aP +
    SLOPES.agePP * aPP +
    SLOPES.sexMale * sexMale +
    SLOPES.baselinePhq9 * b +
    SLOPES.baselinePhq9P * bP +
    SLOPES.baselinePhq9PP * bPP +
    SLOPES.gad7 * g +
    SLOPES.gad7P * gP +
    SLOPES.gad7PP * gPP
  );
}

export type RiskModelPrediction = {
  /** E[phq9_12mo] — the headline "risk score": expected PHQ-9 at 12 months, 0-20. No CI, see file header. */
  riskScore: number;
  medianPhq12mo: number;
  /** P(phq9_12mo <= MODEL_META.remissionCutoff). */
  remissionProbability12mo: number;
  /** P(phq9_12mo <= baseline * (1 - MODEL_META.responseRatio)). */
  responseProbability12mo: number;
  /** P(phq9_12mo = i) for i = 0..RISK_MAX_Y. */
  categoryProbabilities: number[];
  /** True if GAD-7 was skipped and GAD7_FALLBACK was used instead. */
  gad7Imputed: boolean;
};

export function predictRiskModel(input: RiskModelInput): RiskModelPrediction {
  const xbeta = linearPredictor(input);

  // cumGE[j] = P(Y >= j) for j = 0..(RISK_MAX_Y + 1); P(Y>=0)=1 and
  // P(Y > RISK_MAX_Y)=0 by construction (the fitted model has no mass beyond it).
  const cumGE = [1, ...RISK_INTERCEPTS.map((alpha) => plogis(alpha + xbeta)), 0];
  const cumGEAt = (j: number): number => cumGE[j] ?? 0;

  const categoryProbabilities = Array.from(
    { length: RISK_MAX_Y + 1 },
    (_, j) => cumGEAt(j) - cumGEAt(j + 1),
  );

  const riskScore = categoryProbabilities.reduce((sum, p, j) => sum + p * j, 0);

  /** Smallest category j with P(Y <= j) >= 0.5. */
  const pAtMost = (c: number): number => {
    const j = Math.floor(c);
    if (j < 0) return 0;
    if (j >= RISK_MAX_Y) return 1;
    return 1 - cumGEAt(j + 1);
  };
  let medianPhq12mo = RISK_MAX_Y;
  for (let j = 0; j <= RISK_MAX_Y; j++) {
    if (pAtMost(j) >= 0.5) {
      medianPhq12mo = j;
      break;
    }
  }

  return {
    riskScore: Number(riskScore.toFixed(1)),
    medianPhq12mo,
    remissionProbability12mo: pAtMost(MODEL_META.remissionCutoff),
    responseProbability12mo: pAtMost(input.baselinePhq9 * (1 - MODEL_META.responseRatio)),
    categoryProbabilities,
    gad7Imputed: input.gad7Total === null,
  };
}
