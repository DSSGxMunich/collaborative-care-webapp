/**
 * Outcome model — 6-component network meta-analysis (CNMA), fitted on
 * individual-patient data (IPD) across 7 trials.
 * ----------------------------------------------------------------------------
 * The app's predictions are split into two independent parts:
 *
 *   1. A risk score (src/lib/safety.ts) from the three safety questions and
 *      PHQ-9 severity — drives the crisis message only, no outcome numbers.
 *   2. This file: a two-step outcome model.
 *      - Step 1 (src/lib/riskScore.ts): an ordinal regression predicts each
 *        patient's expected 12-month PHQ-9 under usual care ("risk_score")
 *        from age, sex, baseline PHQ-9 and GAD-7.
 *      - Step 2 (this file): a component network meta-analysis (CNMA) — the
 *        real posterior draws below — estimates the 12-month PHQ-9 for
 *        usual care plus each *trial-observed combination* of up to 6
 *        structured-care components, letting each component's effect vary
 *        with risk_score.
 *
 * DATA: src/lib/data/nma-posterior.json holds real PyMC/ArviZ posterior
 * draws (4 chains x 4000 draws, thinned to every 8th draw = 2000 draws) for
 * alpha_study, lambda_risk, beta_component and delta_component_risk, plus
 * `summary` (posterior mean + 95% credible interval per parameter, computed
 * from the FULL unthinned posterior) kept for transparency/documentation.
 * This is real posterior uncertainty, not an approximation from a
 * summary-table CI — every prediction below is a Monte Carlo simulation
 * over the actual draws.
 *
 * Model (from the fitted artifact's manifest):
 *
 *   mu = alpha_study[study]
 *      + lambda_risk * risk_score
 *      + sum_k( component[k] * (beta_component[k] + delta_component_risk[k] * risk_score) )
 *
 *   endpoint = clamp(mu, 0, 27)     -- mu models the ABSOLUTE 12-month PHQ-9
 *                                       directly (outcome: "phq9_12m"), not a
 *                                       change score like the previous
 *                                       2-component model did.
 *
 * `alpha_study` (per-trial intercept) has no single pooled hyperparameter
 * either — same caveat as the previous model: for a new/typical practice we
 * average alpha_study across the 7 reported trials, now done per posterior
 * draw (ALPHA_STUDY_MEAN draws in the data file) so the between-trial
 * heterogeneity propagates into the credible interval rather than being
 * dropped. One trial (08_Coventry_2015) has a very wide, weakly-identified
 * posterior for its own intercept (95% CI roughly -8 to +5) — averaging
 * across all 7 trials means this uncertainty is real and reflected in the
 * width of every scenario's interval, not a bug.
 *
 * COMPONENTS & PACKAGES: the fitted model additively decomposes 6
 * structured-care components (COMPONENT_ORDER below), but only 6 specific
 * *combinations* of them were actually trialled (`allowed_component_packages`
 * in the manifest, one all-zero package = usual care). Per the CNMA
 * additivity assumption — and per instruction, no component x component
 * interaction term is added beyond what's in the formula above — a
 * package's effect is simply the sum of its active components' own effects.
 *
 * The app renders two separate scenario sets (two tabs on the results
 * page), deliberately not merged into one list:
 *   - COMBO_SCENARIO_IDS: usual care + the 6 packages actually trialled
 *     (PACKAGES below) — real, trial-observed treatment arms.
 *   - SINGLE_SCENARIO_IDS: usual care + each of the 6 components ADDED
 *     ALONE. These are not trial-observed; they're the additive formula
 *     applied to a single component, shown on their own tab specifically
 *     so patients don't read "combination has more components" as "more
 *     components is always better" — the two are different questions.
 *
 * `sigma` (residual SD) is kept in the data file for transparency but is
 * currently unused, same as before — the app shows the estimated PHQ-9
 * itself, not derived response/remission probabilities.
 */

import nmaData from "./data/nma-posterior.json";
import { effectiveGad7Score } from "./gad7";
import { computeRiskScore, RISK_SCORE_TRAINING } from "./riskScore";
import { ageFromBirthDate, type Profile } from "./session";

export type ComponentId =
  | "counseling"
  | "manualTherapy"
  | "patientPreference"
  | "automatedFollowUp"
  | "relapsePrevention"
  | "familyInvolvement";

/** Order matches `component_order` in the fitted artifact's manifest — index into betaComponent/deltaComponentRisk draws. */
export const COMPONENT_ORDER: ComponentId[] = [
  "counseling",
  "manualTherapy",
  "patientPreference",
  "automatedFollowUp",
  "relapsePrevention",
  "familyInvolvement",
];

export type PackageId =
  "usualCare" | "packageA" | "packageB" | "packageC" | "packageD" | "packageE" | "packageF";
/** A single component added alone to usual care — not a trial-observed package, see SINGLE_SCENARIO_IDS. */
export type SingleId = `single_${ComponentId}`;
export type ScenarioId = PackageId | SingleId;

export type Package = { id: PackageId; components: ComponentId[] };

const PACKAGE_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** The trial-observed component combinations from `allowed_component_packages`, excluding the all-zero (usual care) row. */
function buildPackages(): Package[] {
  const packages: Package[] = [];
  for (const row of nmaData.allowedComponentPackages) {
    if (row.every((v) => v === 0)) continue; // usual care — handled as its own scenario, not a "package"
    const components = COMPONENT_ORDER.filter((_, i) => row[i] === 1);
    const letter = PACKAGE_LETTERS[packages.length];
    if (!letter) continue; // more rows than PACKAGE_LETTERS would be a data/type mismatch
    packages.push({ id: `package${letter}`, components });
  }
  return packages;
}

/** Every trial-observed treatment combination (usual care excluded — see COMBO_SCENARIO_IDS). */
export const PACKAGES: Package[] = buildPackages();

/**
 * Combination tab: usual care, then each trial-observed package (real arms
 * from the 7 included trials — see file header on allowed packages).
 */
export const COMBO_SCENARIO_IDS: ScenarioId[] = ["usualCare", ...PACKAGES.map((p) => p.id)];

/**
 * Single-component tab: usual care, then each of the 6 components added
 * ALONE. None of these were tested in isolation by any trial — they're the
 * model's additive decomposition (component[k] * (beta_k + delta_k *
 * risk_score)) applied to just one component, shown separately from
 * COMBO_SCENARIO_IDS so a lower combo number never reads as "more
 * components is automatically better than one well-matched component".
 */
export const SINGLE_SCENARIO_IDS: ScenarioId[] = [
  "usualCare",
  ...COMPONENT_ORDER.map((c): SingleId => `single_${c}`),
];

function componentsFor(id: ScenarioId): ComponentId[] {
  if (id === "usualCare") return [];
  if (id.startsWith("single_")) {
    const componentId = id.slice("single_".length) as ComponentId;
    return [componentId];
  }
  return PACKAGES.find((p) => p.id === id)?.components ?? [];
}

export const MODEL_META = {
  followUpMonths: 12,
  version: nmaData.artifactVersion,
};

const draws = nmaData.draws;
const N_DRAWS = draws.alphaStudyMean.length;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round1 = (x: number) => Number(x.toFixed(1));

/** Linear-interpolated quantile of a value already sorted ascending. */
function quantileOf(sortedAsc: number[], q: number): number {
  const pos = (sortedAsc.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const lowVal = sortedAsc[lower] ?? 0;
  if (lower === upper) return lowVal;
  const upVal = sortedAsc[upper] ?? lowVal;
  return lowVal + (upVal - lowVal) * (pos - lower);
}

/**
 * Full posterior draws (real, thinned PyMC draws — not synthetic) of the
 * estimated 12-month PHQ-9 for one scenario, at one patient's risk score.
 * mu = alpha_study (per-draw mean across trials) + lambda_risk * risk_score
 *    + sum over active components of (beta_component + delta_component_risk * risk_score)
 * No component x component interaction term is added — see file header.
 */
function simulateEndpointDraws(components: ComponentId[], riskScore: number): number[] {
  const activeIdx = components.map((c) => COMPONENT_ORDER.indexOf(c));
  const out = new Array<number>(N_DRAWS);
  for (let i = 0; i < N_DRAWS; i++) {
    let mu = (draws.alphaStudyMean[i] ?? 0) + (draws.lambdaRisk[i] ?? 0) * riskScore;
    for (const k of activeIdx) {
      mu +=
        (draws.betaComponent[i]?.[k] ?? 0) + (draws.deltaComponentRisk[i]?.[k] ?? 0) * riskScore;
    }
    out[i] = clamp(mu, 0, 27);
  }
  return out;
}

export type Range = readonly [number, number];

export type Scenario = {
  id: ScenarioId;
  components: ComponentId[];
  riskScore: number;
  expectedEndpoint: number;
  endpointRange: Range;
};

export function predictScenario(input: PredictionInput, id: ScenarioId): Scenario {
  const riskScore = riskScoreFor(input);
  const components = componentsFor(id);
  const endpointDraws = simulateEndpointDraws(components, riskScore);
  const sorted = [...endpointDraws].sort((a, b) => a - b);
  const mean = endpointDraws.reduce((sum, v) => sum + v, 0) / endpointDraws.length;

  return {
    id,
    components,
    riskScore: round1(riskScore),
    expectedEndpoint: round1(mean),
    endpointRange: [round1(quantileOf(sorted, 0.025)), round1(quantileOf(sorted, 0.975))],
  };
}

/**
 * Real posterior draws (thinned, ~2000) of the 12-month PHQ-9 for a scenario
 * already computed by predictScenario — for the results page's distribution
 * chart. Recomputed from the scenario's own components/riskScore, so it's
 * deterministic (same scenario -> same draws) rather than a fresh random
 * sample each render.
 */
export function posteriorEndpointDraws(scenario: Scenario): number[] {
  return simulateEndpointDraws(scenario.components, scenario.riskScore);
}

export type ComponentEstimate = {
  id: ComponentId;
  /** This component's own contribution (beta_component + delta_component_risk * risk_score) at this patient's risk score. */
  adjustedEffect: number;
  /** 95% credible interval of adjustedEffect, from the real posterior draws. */
  effectRange: Range;
};

/** Per-component decomposition of the fitted effects, at one patient's risk score — for transparency, not a predictable scenario on its own (see file header on allowed packages). */
export function estimateComponents(input: PredictionInput): ComponentEstimate[] {
  const riskScore = riskScoreFor(input);
  return COMPONENT_ORDER.map((id, k) => {
    const effectDraws = new Array<number>(N_DRAWS);
    for (let i = 0; i < N_DRAWS; i++) {
      effectDraws[i] =
        (draws.betaComponent[i]?.[k] ?? 0) + (draws.deltaComponentRisk[i]?.[k] ?? 0) * riskScore;
    }
    const sorted = [...effectDraws].sort((a, b) => a - b);
    const mean = effectDraws.reduce((sum, v) => sum + v, 0) / effectDraws.length;
    return {
      id,
      adjustedEffect: round1(mean),
      effectRange: [round1(quantileOf(sorted, 0.025)), round1(quantileOf(sorted, 0.975))],
    };
  });
}

export type PredictionInput = {
  baseline: number;
  profile: Profile;
};

function riskScoreFor(input: PredictionInput): number {
  const age = input.profile.birthDate ? ageFromBirthDate(input.profile.birthDate) : null;
  const gad7Total = effectiveGad7Score(input.profile);
  return computeRiskScore({ age, sex: input.profile.sex, baselinePhq9: input.baseline, gad7Total });
}

/** Patient characteristics the fitted model actually uses. */
export type PredictorRow = {
  id: "baseline" | "age" | "sex" | "gad7" | "riskScore";
  value: string;
  available: boolean;
};

export function describePredictors(input: PredictionInput): PredictorRow[] {
  const p = input.profile;
  const age = p.birthDate ? ageFromBirthDate(p.birthDate) : null;
  const gad7Value = effectiveGad7Score(p);
  return [
    { id: "baseline", value: `${input.baseline}/27`, available: true },
    { id: "age", value: age !== null ? age.toFixed(2) : "–", available: age !== null },
    { id: "sex", value: p.sex ?? "–", available: p.sex !== null },
    {
      id: "gad7",
      value: gad7Value !== null ? `${gad7Value}/21` : "–",
      available: gad7Value !== null,
    },
    {
      id: "riskScore",
      value: round1(riskScoreFor(input)).toString(),
      available: true,
    },
  ];
}

export { RISK_SCORE_TRAINING };

export function buildPredictions(input: PredictionInput) {
  const estimates = estimateComponents(input);
  const scenarios = COMBO_SCENARIO_IDS.map((id) => predictScenario(input, id));
  const singleScenarios = SINGLE_SCENARIO_IDS.map((id) => predictScenario(input, id));
  const predictors = describePredictors(input);

  return { estimates, scenarios, singleScenarios, predictors };
}
