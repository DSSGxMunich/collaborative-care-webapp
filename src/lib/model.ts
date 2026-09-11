/**
 * Outcome model — network meta-regression (NMA), fitted coefficients.
 * ----------------------------------------------------------------------------
 * The app's predictions are split into two independent parts:
 *
 *   1. A risk score (src/lib/safety.ts) from the three safety questions and
 *      PHQ-9 severity — drives the crisis message only, no outcome numbers.
 *   2. This file: a network meta-regression outcome model, fitted on
 *      individual-patient data (IPD) across several trials, estimating the
 *      12-month PHQ-9 score under usual care and under each of the two
 *      available structured-care components added to usual care.
 *
 * FITTED_COEFFICIENTS below are real posterior means (with 95% HDI /
 * credible intervals) from the fitted IPD meta-analysis model.
 * `STANDARDIZATION` is the mean/SD of baseline PHQ-9 and age in the
 * training data (analysis_df), used to standardize both before applying
 * gamma_phq9 / theta_age / the delta_c*_age terms, exactly as the model
 * was fit. `SEX_CODE` — which sex category the model treats as the 0/1
 * reference level — is confirmed: Male = 0, Female = 1.
 *
 * `alphaStudy` (the population-level intercept) is an APPROXIMATION:
 * az.summary() reported a separate posterior mean per trial
 * (`alpha_study[...]`, see ALPHA_STUDY_BY_TRIAL below) rather than a single
 * pooled hyperparameter (e.g. a `mu_alpha`) for a new/typical practice.
 * `alphaStudy` here is the unweighted mean across the reported trials, which
 * treats every included trial as equally informative about a "typical" new
 * practice — a properly precision-weighted or model-based population mean
 * may differ, and between-study heterogeneity is substantial (trial
 * intercepts range from about -3.8 to -1.0).
 *
 * Model structure — linear predictor for the modelled PHQ-9 change, defined
 * as (endpoint - baseline), i.e. NEGATIVE = improvement / symptom
 * reduction, POSITIVE = worsening (c1 = "followUp" component present, c2 =
 * "relapsePrevention" component present, both 0/1; ageZ / baselineZ =
 * standardized age / baseline PHQ-9; sex = 0/1 per SEX_CODE):
 *
 *   change = alphaStudy
 *          + beta_follow_up   * c1
 *          + beta_relapse     * c2
 *          + beta_interaction * c1 * c2
 *          + gamma_phq9       * baselineZ
 *          + theta_age        * ageZ
 *          + theta_sex        * sex
 *          + delta_c1_age     * c1 * ageZ
 *          + delta_c2_age     * c2 * ageZ
 *          + delta_c1_sex     * c1 * sex
 *          + delta_c2_sex     * c2 * sex
 *
 *   endpoint = clamp(baseline + change, 0, 27)
 *
 * The app only ever asks for one component at a time (c1=1,c2=0 or
 * c1=0,c2=1) — the two components are never shown added together, since
 * with only two components estimated we show "usual care + each of them"
 * rather than a combined addition. `beta_interaction` is kept here as a
 * real fitted parameter for transparency but drops out of every scenario
 * this app actually renders (c1*c2 = 0 whenever only one is active).
 *
 * This sign convention (rather than change = baseline - endpoint) is
 * inferred, not confirmed against the fitting script: alpha_study is
 * consistently negative across all 12 reported trials (-3.8 to -1.0),
 * which is only clinically plausible if negative alpha_study means usual
 * care improves PHQ-9 on average — the alternative (positive = improvement)
 * would mean usual-care patients got worse in nearly every included trial.
 * If this turns out to be wrong, negate `change` everywhere it's used below.
 *
 * `sigma` (residual SD, individual-level dispersion) is kept below as a real
 * fitted parameter for transparency but is currently unused — the app only
 * shows the estimated PHQ-9 score itself, not derived response/remission
 * probabilities.
 *
 * The `range` shown for each scenario reflects *parameter* uncertainty:
 * each coefficient's 95% CI is converted to an approximate standard error
 * (CI half-width / 1.96), the SEs of the terms active in that scenario are
 * combined by root-sum-of-squares (i.e. treated as independent — the
 * actual posterior covariance is not available from a summary table
 * alone), and the resulting interval is propagated through the same
 * endpoint transform as the point estimate. This is an approximation, not
 * the model's true joint credible interval — treat it as indicative, not
 * exact. `alphaStudy`'s own between-trial uncertainty is not folded into
 * this range (see above).
 *
 * PLACEHOLDER — posterior draws: `posteriorEndpointDraws` below stands in
 * for the model's real posterior samples. It approximates a posterior by
 * drawing from Normal(expectedEndpoint, SE), with SE derived from the CI
 * above, purely so the results page has something to plot as a
 * distribution. Replace it once the real posterior draws of the network
 * meta-regression parameters are available.
 */

import type { L } from "./i18n";
import { ageFromBirthDate, type Profile, type Sex } from "./session";

export type ComponentId = "followUp" | "relapsePrevention";
export type ScenarioId = "usualCare" | ComponentId;

export type PredictionInput = {
  baseline: number;
  profile: Profile;
};

/** A fitted coefficient with its 95% credible interval. */
export type CoefCI = { estimate: number; ci: readonly [number, number] };

/**
 * Per-trial posterior mean intercept (alpha_study[<trial>]) from az.summary().
 * Kept for transparency; ALPHA_STUDY_MEAN below (an unweighted average of
 * these) is what the model actually uses — see the file header for caveats.
 */
export const ALPHA_STUDY_BY_TRIAL: Record<string, number> = {
  "02_Aragones_2012": -3.561,
  "04_Bekelman_2018": -1.995,
  "08_Coventry_2015": -1.479,
  "10_Fletcher_2021a": -1.928,
  "11_Fletcher_2021b": -1.459,
  "12_Gensichen_2009": -2.241,
  "13_Hölzel_2018": -0.989,
  "21_Richards_2008": -3.829,
  "22_Richards_2013": -2.555,
  "24_Rollman_2016": -1.32,
  "30_Srinivasan_2022": -3.353,
  "33_Zimmerman_2016": -3.254,
};

const trialAlphas = Object.values(ALPHA_STUDY_BY_TRIAL);
/** Unweighted mean of ALPHA_STUDY_BY_TRIAL — see file header for caveats. */
export const ALPHA_STUDY_MEAN = trialAlphas.reduce((a, b) => a + b, 0) / trialAlphas.length;

/** Real fitted coefficients, as supplied (az.summary() posterior means + 95% HDI). */
export const FITTED_COEFFICIENTS = {
  /** Approximated population-level intercept — see file header. */
  alphaStudy: ALPHA_STUDY_MEAN,

  betaFollowUp: { estimate: -0.39, ci: [-0.902, 0.112] } as CoefCI,
  betaRelapse: { estimate: -1.62, ci: [-2.584, -0.691] } as CoefCI,
  /** Real fitted parameter, unused in any scenario this app renders — see file header. */
  betaInteraction: { estimate: 0.765, ci: [-0.168, 1.725] } as CoefCI,

  gammaPhq9: { estimate: -2.755, ci: [-2.892, -2.62] } as CoefCI,

  thetaAge: { estimate: -0.105, ci: [-0.274, 0.07] } as CoefCI,
  thetaSex: { estimate: -0.029, ci: [-0.341, 0.273] } as CoefCI,

  deltaC1Age: { estimate: 0.199, ci: [-0.089, 0.507] } as CoefCI,
  deltaC2Age: { estimate: 0.12, ci: [-0.276, 0.493] } as CoefCI,
  deltaC1Sex: { estimate: 0.242, ci: [-0.327, 0.803] } as CoefCI,
  deltaC2Sex: { estimate: -0.432, ci: [-1.076, 0.237] } as CoefCI,

  /** Residual noise (SD); posterior SD 0.040, 95% HDI [4.807, 4.963]. */
  sigma: 4.886,
};

/**
 * Standardization constants from the training data (analysis_df), used to
 * standardize baseline PHQ-9 and age before applying gamma_phq9 / theta_age
 * / the delta_c*_age terms — matches how the model was fit.
 */
export const STANDARDIZATION = {
  phq9: { mean: 11.822582582582582, sd: 6.265154184273839 },
  age: { mean: 49.85614969535585, sd: 15.878823152237644 },
};

/**
 * Sex: Male = 0, Female = 1. Only these two categories were represented in
 * the fitted trials — any other Sex value has no coefficient and is
 * treated as unknown (see standardizeInput), which drops the sex terms
 * from the linear predictor entirely, i.e. the sex-unadjusted, averaged
 * estimate.
 */
export const SEX_CODE: Partial<Record<Sex, 0 | 1>> = { male: 0, female: 1 };

export const MODEL_META = {
  followUpMonths: 12,
  version: "0.5-fitted",
};

export const COMPONENT_BETA: Record<ComponentId, CoefCI> = {
  followUp: FITTED_COEFFICIENTS.betaFollowUp,
  relapsePrevention: FITTED_COEFFICIENTS.betaRelapse,
};

/** Which component ids (in display order) get shown added to usual care. */
export const SCENARIO_IDS: ScenarioId[] = ["usualCare", "followUp", "relapsePrevention"];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round1 = (x: number) => Number(x.toFixed(1));
const standardize = (x: number, mean: number, sd: number) => (sd > 0 ? (x - mean) / sd : 0);

/** Standard-normal draw via Box–Muller. Used only by posteriorEndpointDraws (placeholder). */
function randomStandardNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** ~95% CI half-width converted to an approximate standard error. */
const seFromCi = (coef: CoefCI) => (coef.ci[1] - coef.ci[0]) / (2 * 1.96);

type Term = { coef: CoefCI; x: number };

/** Sums point estimates and combines term SEs (independent, root-sum-of-squares). */
function combineTerms(terms: Term[]) {
  const point = terms.reduce((sum, term) => sum + term.coef.estimate * term.x, 0);
  const variance = terms.reduce((v, term) => v + (seFromCi(term.coef) * Math.abs(term.x)) ** 2, 0);
  const halfWidth = 1.96 * Math.sqrt(variance);
  return { point, low: point - halfWidth, high: point + halfWidth };
}

type Standardized = { ageZ: number | null; sexX: 0 | 1 | null; baselineZ: number };

function standardizeInput(input: PredictionInput): Standardized {
  const age = input.profile.birthDate ? ageFromBirthDate(input.profile.birthDate) : null;
  return {
    ageZ: age === null ? null : standardize(age, STANDARDIZATION.age.mean, STANDARDIZATION.age.sd),
    // SEX_CODE only covers female/male; any other (or missing) sex resolves
    // to null here, which drops the sex terms below (average-across-all).
    sexX: input.profile.sex ? (SEX_CODE[input.profile.sex] ?? null) : null,
    baselineZ: standardize(input.baseline, STANDARDIZATION.phq9.mean, STANDARDIZATION.phq9.sd),
  };
}

/** Active linear-predictor terms (with CI) for a given scenario (at most one component active). */
function scenarioTerms(component: ComponentId | null, s: Standardized): Term[] {
  const F = FITTED_COEFFICIENTS;
  const c1 = component === "followUp" ? 1 : 0;
  const c2 = component === "relapsePrevention" ? 1 : 0;
  const terms: Term[] = [
    { coef: F.betaFollowUp, x: c1 },
    { coef: F.betaRelapse, x: c2 },
    { coef: F.gammaPhq9, x: s.baselineZ },
  ];
  if (s.ageZ !== null) {
    terms.push({ coef: F.thetaAge, x: s.ageZ });
    terms.push({ coef: F.deltaC1Age, x: c1 * s.ageZ });
    terms.push({ coef: F.deltaC2Age, x: c2 * s.ageZ });
  }
  if (s.sexX !== null) {
    terms.push({ coef: F.thetaSex, x: s.sexX });
    terms.push({ coef: F.deltaC1Sex, x: c1 * s.sexX });
    terms.push({ coef: F.deltaC2Sex, x: c2 * s.sexX });
  }
  return terms;
}

export type ComponentEstimate = {
  id: ComponentId;
  /** This component's own contribution to the change score (added to usual care alone). */
  adjustedEffect: number;
  activeModerators: { label: L; delta: number }[];
};

export type Range = readonly [number, number];

export type Scenario = {
  id: ScenarioId;
  expectedEndpoint: number;
  endpointRange: Range;
};

export function estimateComponents(input: PredictionInput): ComponentEstimate[] {
  const s = standardizeInput(input);
  return (["followUp", "relapsePrevention"] as const).map((id) => {
    const isC1 = id === "followUp";
    const ageDelta =
      s.ageZ === null
        ? 0
        : (isC1 ? FITTED_COEFFICIENTS.deltaC1Age : FITTED_COEFFICIENTS.deltaC2Age).estimate *
          s.ageZ;
    const sexDelta =
      s.sexX === null
        ? 0
        : (isC1 ? FITTED_COEFFICIENTS.deltaC1Sex : FITTED_COEFFICIENTS.deltaC2Sex).estimate *
          s.sexX;
    const activeModerators: { label: L; delta: number }[] = [];
    if (s.ageZ !== null) {
      activeModerators.push({
        label: { de: "Anpassung nach Alter", en: "Age adjustment" },
        delta: Number(ageDelta.toFixed(2)),
      });
    }
    if (s.sexX !== null) {
      activeModerators.push({
        label: { de: "Anpassung nach Geschlecht", en: "Sex adjustment" },
        delta: Number(sexDelta.toFixed(2)),
      });
    }
    return {
      id,
      adjustedEffect: Number((COMPONENT_BETA[id].estimate + ageDelta + sexDelta).toFixed(2)),
      activeModerators,
    };
  });
}

export function predictScenario(input: PredictionInput, id: ScenarioId): Scenario {
  const s = standardizeInput(input);
  const component = id === "usualCare" ? null : id;
  const terms = scenarioTerms(component, s);
  const change = combineTerms(terms);
  // alphaStudy has no CI (only per-trial point estimates were supplied,
  // no pooled hyperparameter) — add its point value only, see file header.
  const alpha = FITTED_COEFFICIENTS.alphaStudy;

  // Fitted outcome = (endpoint - baseline), negative = improvement. This
  // matches alpha_study being consistently negative across every trial
  // (average usual-care improvement) — see file header.
  const rawChangePoint = change.point + alpha;
  const rawChangeLow = change.low + alpha;
  const rawChangeHigh = change.high + alpha;

  const endpointPoint = clamp(input.baseline + rawChangePoint, 0, 27);
  const endpointLow = clamp(input.baseline + rawChangeLow, 0, 27);
  const endpointHigh = clamp(input.baseline + rawChangeHigh, 0, 27);

  return {
    id,
    expectedEndpoint: round1(endpointPoint),
    endpointRange: [round1(endpointLow), round1(endpointHigh)],
  };
}

/**
 * PLACEHOLDER: draws a synthetic posterior sample for the estimated
 * 12-month PHQ-9 endpoint, approximated as Normal(expectedEndpoint, SE)
 * where SE is derived from the already-computed 95% credible interval.
 * This stands in for the network meta-regression's real posterior draws,
 * which will replace this function once supplied. See file header.
 */
export function posteriorEndpointDraws(scenario: Scenario, n = 400): number[] {
  const se = (scenario.endpointRange[1] - scenario.endpointRange[0]) / (2 * 1.96);
  return Array.from({ length: n }, () =>
    round1(clamp(scenario.expectedEndpoint + randomStandardNormal() * se, 0, 27)),
  );
}

/** Patient characteristics the fitted model actually uses. */
export type PredictorRow = {
  id: "baseline" | "age" | "sex";
  value: string;
  available: boolean;
};

export function describePredictors(input: PredictionInput): PredictorRow[] {
  const p = input.profile;
  const age = p.birthDate ? ageFromBirthDate(p.birthDate) : null;
  return [
    { id: "baseline", value: `${input.baseline}/27`, available: true },
    { id: "age", value: age !== null ? age.toFixed(2) : "–", available: age !== null },
    { id: "sex", value: p.sex ?? "–", available: p.sex !== null },
  ];
}

export function buildPredictions(input: PredictionInput) {
  const estimates = estimateComponents(input);
  const scenarios = SCENARIO_IDS.map((id) => predictScenario(input, id));
  const predictors = describePredictors(input);

  return { estimates, scenarios, predictors };
}
