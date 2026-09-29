/**
 * Outcome model — 10-component network meta-analysis (CNMA), fitted on
 * individual-patient data (IPD) across 12 studies.
 * ----------------------------------------------------------------------------
 * The app's predictions are split into two independent parts:
 *
 *   1. A risk score (src/lib/safety.ts) from the three safety questions and
 *      PHQ-9 severity — drives the crisis message only, no outcome numbers.
 *   2. This file: a two-step outcome model.
 *      - Step 1 (src/lib/riskScore.ts): a proportional-odds mixed model
 *        predicts each patient's expected-outcome risk score ("risk_score",
 *        `eta`) from age, sex and baseline PHQ-9 (no GAD-7 — dropped as a
 *        predictor in this refit).
 *      - Step 2 (this file): a component network meta-analysis (CNMA) — the
 *        real posterior draws below — estimates the 12-month PHQ-9 for
 *        usual care plus each of 10 structured-care components added on its
 *        own, letting each component's effect vary with risk_score.
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
 *                                       directly (outcome: "phq9_12m").
 *
 * `alpha_study` (per-trial intercept) has no single pooled hyperparameter:
 * for a new/typical practice we average alpha_study across the 12 reported
 * studies, done per posterior draw (ALPHA_STUDY_MEAN draws in the data
 * file) so the between-study heterogeneity propagates into the credible
 * interval rather than being dropped.
 *
 * COMPONENTS: the fitted model additively decomposes 10 structured-care
 * components (COMPONENT_ORDER below). Unlike the previous 6-component
 * refit, no fixed set of trial-tested *combinations* is presented here —
 * this refit's manifest doesn't flag any specific combination as
 * trial-tested (see the CNMA's own manifest), so the app only shows each
 * component added ALONE to usual care (SCENARIO_IDS below), the additive
 * formula applied to one component at a time. Per the CNMA additivity
 * assumption, a combination's effect would be the sum of its components'
 * own effects, but this app deliberately doesn't offer arbitrary
 * multi-component combinations as a feature — see PR discussion for why
 * (no combination is trial-observed in this refit, unlike the previous one).
 *
 * `sigma` (residual SD) is kept in the data file for transparency but is
 * currently unused, same as before — the app shows the estimated PHQ-9
 * itself, not derived response/remission probabilities.
 */

import nmaData from "./data/nma-posterior.json";
import { computeRiskScore, RISK_SCORE_TRAINING } from "./riskScore";
import { ageFromBirthDate, type Profile } from "./session";

export type ComponentId =
  | "specialistInvolvement"
  | "psychologicalTreatment"
  | "goalSetting"
  | "patientPreference"
  | "automatedFollowUp"
  | "regularPatientReview"
  | "copingStrategies"
  | "relapsePrevention"
  | "familyInvolvement"
  | "communityCulturalBg";

/**
 * Order matches `componentOrder` in nma-posterior.json (itself the fitted
 * artifact's `.nc` coordinate order) — index into betaComponent/
 * deltaComponentRisk draws positionally, not by name.
 */
export const COMPONENT_ORDER: ComponentId[] = [
  "specialistInvolvement",
  "psychologicalTreatment",
  "goalSetting",
  "patientPreference",
  "automatedFollowUp",
  "regularPatientReview",
  "copingStrategies",
  "relapsePrevention",
  "familyInvolvement",
  "communityCulturalBg",
];

/** A single component added alone to usual care — the only kind of scenario this refit's data supports (see file header). */
export type SingleId = `single_${ComponentId}`;
export type ScenarioId = "usualCare" | SingleId;

/** Usual care, then each of the 10 components added ALONE — see file header on why no combinations are offered. */
export const SCENARIO_IDS: ScenarioId[] = [
  "usualCare",
  ...COMPONENT_ORDER.map((c): SingleId => `single_${c}`),
];

function componentsFor(id: ScenarioId): ComponentId[] {
  if (id === "usualCare") return [];
  return [id.slice("single_".length) as ComponentId];
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
 * mu = alpha_study (per-draw mean across studies) + lambda_risk * risk_score
 *    + sum over active components of (beta_component + delta_component_risk * risk_score)
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

/** Per-component decomposition of the fitted effects, at one patient's risk score — for transparency, not a predictable scenario on its own. */
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
  return computeRiskScore({ age, sex: input.profile.sex, baselinePhq9: input.baseline });
}

/** Patient characteristics the fitted model actually uses. */
export type PredictorRow = {
  id: "baseline" | "age" | "sex" | "riskScore";
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
    {
      id: "riskScore",
      value: round1(riskScoreFor(input)).toString(),
      available: true,
    },
  ];
}

export { RISK_SCORE_TRAINING };

/**
 * Usual care stays first as the fixed reference row; everything else is
 * ranked most helpful -> least helpful, i.e. ascending expectedEndpoint
 * (lower PHQ-9 is the better outcome).
 */
function rankByHelpfulness(scenarios: Scenario[]): Scenario[] {
  const [usualCare, ...rest] = scenarios;
  if (!usualCare) return scenarios;
  return [usualCare, ...rest.sort((a, b) => a.expectedEndpoint - b.expectedEndpoint)];
}

/**
 * Whether a scenario "may offer additional benefit": its expected 12-month
 * PHQ-9 beats usual care's. Compared against usual care, not the patient's
 * score today: with a high baseline almost every option lands below today
 * (scores drift down over 12 months either way), so that comparison would
 * mark nearly every option, including ones expected to do worse than usual
 * care. Falls back to `baseline` if usual care is missing.
 */
export function beatsUsualCare(scenarios: Scenario[], baseline: number) {
  const reference = scenarios.find((s) => s.id === "usualCare")?.expectedEndpoint ?? baseline;
  return (scenario: Scenario) =>
    scenario.id !== "usualCare" && scenario.expectedEndpoint < reference;
}

export function buildPredictions(input: PredictionInput) {
  const estimates = estimateComponents(input);
  const predictors = describePredictors(input);

  // Ranked best-to-worst by expectedEndpoint (lower PHQ-9 = fewer symptoms
  // = better) via rankByHelpfulness, since each component's effect varies
  // with this patient's risk score (delta_component_risk), so there's no
  // single fixed "best" order across patients — it has to be resorted per
  // prediction, not baked into SCENARIO_IDS.
  const scenarios = rankByHelpfulness(SCENARIO_IDS.map((id) => predictScenario(input, id)));

  return { estimates, scenarios, predictors };
}
