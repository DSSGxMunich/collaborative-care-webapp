/**
 * Generic numeric helpers shared by the two independent fitted models
 * (model.ts — step 1, riskModel.ts — step 2). Nothing in this file is
 * specific to either model's coefficients; it's the reusable math each one
 * builds on. See model.ts / riskModel.ts for the actual model structure.
 */

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const round1 = (x: number) => Number(x.toFixed(1));

/** z-score: (x - mean) / sd, or 0 if sd is not positive. */
export const standardize = (x: number, mean: number, sd: number) => (sd > 0 ? (x - mean) / sd : 0);

/** Abramowitz & Stegun 7.1.26 approximation of the error function. */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** P(X <= x) for X ~ Normal(mean, sd). Used by model.ts's response/remission probabilities. */
export function normalCdf(x: number, mean: number, sd: number): number {
  if (sd <= 0) return x < mean ? 0 : 1;
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

/** The logistic sigmoid, 1 / (1 + e^-x). Used by riskModel.ts's cumulative-logit model. */
export const plogis = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * Restricted cubic spline basis for a 4-knot rcs() term (Harrell's rms::rcs,
 * default norm=2: raw truncated-cubic terms divided by the squared outer-knot
 * span). Returns [x, term1, term2] matching the "x", "x'", "x''" columns rms
 * produces for a 4-knot spline. Used by riskModel.ts.
 */
export function rcsBasis4(
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
