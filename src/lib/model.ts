/**
 * Depression-care outcome model — fitted coefficients (Bayesian, az.summary()).
 * ----------------------------------------------------------------------------
 * FITTED_COEFFICIENTS below are the real posterior means (with 95% credible
 * intervals) supplied for the IPD meta-analysis model. Two things are still
 * PLACEHOLDERS, and everything downstream of them is a best-effort, clearly
 * flagged approximation until they're confirmed:
 *
 *   1. `alphaStudy` — the study-level intercept (mean of alpha_study). It
 *      was not part of the fitted-coefficient table supplied; currently 0.
 *   2. `STANDARDIZATION` — the mean/SD used to standardize baseline PHQ-9
 *      and age when the model was fit, and `SEX_CODE` — which sex category
 *      the model treats as the 0/reference level. Using the wrong constants
 *      here silently shifts every prediction, so these must be confirmed
 *      before the numbers below are treated as clinically valid.
 *
 * Model structure — linear predictor for the modelled PHQ-9 change
 * ("improvement"; c1 = "followUp" component present, c2 =
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
 *   endpoint = clamp(baseline - change, 0, 27)
 *
 * `sigma` (residual SD) models individual-level dispersion around that mean
 * and is used to derive response/remission probabilities as normal-tail
 * probabilities: P(endpoint <= threshold) = Φ((threshold - endpoint) / sigma).
 *
 * The `range` shown for each scenario reflects *parameter* uncertainty
 * instead: each coefficient's 95% CI is converted to an approximate
 * standard error (CI half-width / 1.96), the SEs of the terms active in
 * that scenario are combined by root-sum-of-squares (i.e. treated as
 * independent — the actual posterior covariance is not available from a
 * summary table alone), and the resulting interval is propagated through
 * the same endpoint / response / remission transforms as the point
 * estimate. This is an approximation, not the model's true joint credible
 * interval — treat it as indicative, not exact.
 */

import type { L } from "./i18n";
import type { Profile, Sex } from "./session";

export type ComponentId = "followUp" | "relapsePrevention";

export type PredictionInput = {
  baseline: number;
  functioning: number | null;
  profile: Profile;
};

/** A fitted coefficient with its 95% credible interval. */
export type CoefCI = { estimate: number; ci: readonly [number, number] };

/**
 * Real fitted coefficients, as supplied. `alphaStudy` is a placeholder
 * (missing from the source table) and `sigma` has no CI in az.summary().
 */
export const FITTED_COEFFICIENTS = {
  /** PLACEHOLDER — mean of alpha_study; not supplied yet. */
  alphaStudy: 0,

  betaFollowUp: { estimate: -0.558, ci: [-1.121, 0.084] } as CoefCI,
  betaRelapse: { estimate: 0.293, ci: [-1.264, 1.773] } as CoefCI,
  betaInteraction: { estimate: 0.306, ci: [-1.23, 1.811] } as CoefCI,

  gammaPhq9: { estimate: -2.186, ci: [-2.404, -1.965] } as CoefCI,

  thetaAge: { estimate: -0.36, ci: [-0.676, -0.04] } as CoefCI,
  thetaSex: { estimate: -0.501, ci: [-1.021, -0.001] } as CoefCI,

  deltaC1Age: { estimate: 0.377, ci: [-0.026, 0.795] } as CoefCI,
  deltaC2Age: { estimate: -0.888, ci: [-1.754, -0.004] } as CoefCI,
  deltaC1Sex: { estimate: 0.514, ci: [-0.205, 1.235] } as CoefCI,
  deltaC2Sex: { estimate: -0.778, ci: [-1.92, 0.304] } as CoefCI,

  /** Residual noise (SD), no CI reported. */
  sigma: 5.067,
};

/** PLACEHOLDER — standardization constants used when the model was fit. */
export const STANDARDIZATION = {
  phq9: { mean: 15, sd: 6 },
  age: { mean: 45, sd: 15 },
};

/** PLACEHOLDER reference coding — confirm against the fitted model. */
export const SEX_CODE: Record<Sex, 0 | 1> = { female: 0, male: 1 };

/** Representative age (years) used to standardize each age band. */
const AGE_MIDPOINT: Record<NonNullable<Profile["ageBand"]>, number> = {
  "18-29": 24,
  "30-49": 40,
  "50-64": 57,
  "65+": 72,
};

export const MODEL_META = {
  followUpMonths: 6,
  version: "0.3-fitted (pending intercept & calibration)",
  remissionCutoff: 5,
  /** Response = >= 50% symptom reduction relative to baseline. */
  responseRatio: 0.5,
};

/** Shown wherever numbers appear. */
export const PROTOTYPE_NOTE: L = [
  "Die Effektstärken der Bausteine stammen aus dem gefitteten Modell der IPD-Metaanalyse. Der Studien-Achsenabschnitt und die Standardisierungskonstanten für Alter und PHQ-9 sind vorläufige Platzhalter, bis die endgültigen Werte vorliegen — absolute Schätzungen können sich dadurch noch verschieben.",
  "The component effect sizes come from the fitted IPD meta-analysis model. The study intercept and the standardization constants for age and PHQ-9 are provisional placeholders until final values are available — absolute estimates may still shift once they are.",
];

export const COMPONENT_NOTE: L = [
  "Diese beiden Bausteine sind im Modell direkt geschätzt, einschließlich ihres kombinierten Effekts.",
  "These two components are directly estimated in the model, including their combined effect.",
];

const dash: L = ["keine Angabe", "not provided"];
const SEX_LABEL: Record<Sex, L> = { female: ["weiblich", "female"], male: ["männlich", "male"] };

export type CareComponent = {
  id: ComponentId;
  label: L;
  short: L;
  description: L;
  /** Fitted main effect (posterior mean + 95% CI) on the modelled PHQ-9 change score. */
  beta: CoefCI;
};

export const CARE_COMPONENTS: CareComponent[] = [
  {
    id: "followUp",
    label: ["Strukturierte Wiedervorstellung / Nachverfolgung", "Structured follow-up"],
    short: ["Strukturierte Nachverfolgung", "Structured follow-up"],
    description: [
      "Termine und Rückmeldungen sind im Voraus geplant, auch telefonisch; niemand fällt aus der Behandlung heraus.",
      "Appointments and check-backs are planned in advance, also by telephone, so nobody drops out of care.",
    ],
    beta: FITTED_COEFFICIENTS.betaFollowUp,
  },
  {
    id: "relapsePrevention",
    label: ["Strukturierte Rückfallprävention", "Structured relapse prevention"],
    short: ["Rückfallprävention", "Relapse prevention"],
    description: [
      "Geplante Maßnahmen, um ein Wiederauftreten der Beschwerden früh zu erkennen und ihm vorzubeugen.",
      "Planned measures to detect and prevent a recurrence of symptoms early.",
    ],
    beta: FITTED_COEFFICIENTS.betaRelapse,
  },
];

export const componentById = (id: ComponentId) => CARE_COMPONENTS.find((c) => c.id === id)!;

export type ConfigurationId = "usualCare" | "followUp" | "relapsePrevention" | "combined";

export type DataSupport = "estimable" | "partial" | "uncertain";

export type CareConfiguration = {
  id: ConfigurationId;
  label: L;
  description: L;
  components: ComponentId[];
  dataSupport: DataSupport;
  dataNote: L;
};

export const DATA_SUPPORT_LABEL: Record<DataSupport, L> = {
  estimable: [
    "Direkt aus dem gefitteten Modell geschätzt",
    "Directly estimated by the fitted model",
  ],
  partial: [
    "Nur teilweise durch Studiendaten abgedeckt",
    "Only partly covered by the available trial data",
  ],
  uncertain: [
    "Datenlage für diese Konfiguration unsicher",
    "Data support for this configuration uncertain",
  ],
};

export const CARE_CONFIGURATIONS: CareConfiguration[] = [
  {
    id: "usualCare",
    label: ["Übliche hausärztliche Versorgung", "Usual GP care"],
    description: [
      "Behandlung wie bisher in der Hausarztpraxis: Termine bei Bedarf, Beratung, Verlaufsbeobachtung.",
      "Care as usual in the GP practice: appointments as needed, advice and watchful monitoring.",
    ],
    components: [],
    dataSupport: "estimable",
    dataNote: [
      "Referenzgruppe des Modells (c1 = c2 = 0).",
      "Reference group of the model (c1 = c2 = 0).",
    ],
  },
  {
    id: "followUp",
    label: ["Strukturierte Nachverfolgung", "Structured follow-up"],
    description: [
      "Nur der Baustein strukturierte Wiedervorstellung / Nachverfolgung, zusätzlich zur üblichen Versorgung.",
      "Only the structured follow-up component, in addition to usual care.",
    ],
    components: ["followUp"],
    dataSupport: "estimable",
    dataNote: [
      "Direkt geschätzter Haupteffekt (beta_follow_up).",
      "Directly estimated main effect (beta_follow_up).",
    ],
  },
  {
    id: "relapsePrevention",
    label: ["Rückfallprävention", "Relapse prevention"],
    description: [
      "Nur der Baustein strukturierte Rückfallprävention, zusätzlich zur üblichen Versorgung.",
      "Only the structured relapse-prevention component, in addition to usual care.",
    ],
    components: ["relapsePrevention"],
    dataSupport: "estimable",
    dataNote: [
      "Direkt geschätzter Haupteffekt (beta_relapse).",
      "Directly estimated main effect (beta_relapse).",
    ],
  },
  {
    id: "combined",
    label: [
      "Nachverfolgung und Rückfallprävention kombiniert",
      "Follow-up and relapse prevention combined",
    ],
    description: [
      "Beide Bausteine gemeinsam, einschließlich ihres gefitteten Interaktionseffekts.",
      "Both components together, including their fitted interaction effect.",
    ],
    components: ["followUp", "relapsePrevention"],
    dataSupport: "estimable",
    dataNote: [
      "Enthält den direkt geschätzten Interaktionsterm (beta_interaction).",
      "Includes the directly estimated interaction term (beta_interaction).",
    ],
  },
];

export const COMBINATION_NOTE: L = [
  "Die Kombination beider Bausteine wird nicht als Summe der Einzeleffekte berechnet, sondern nutzt den im Modell direkt geschätzten Interaktionsterm.",
  "The combination of both components is not computed as the sum of the single effects — it uses the interaction term directly estimated by the model.",
];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round1 = (x: number) => Number(x.toFixed(1));
const standardize = (x: number, mean: number, sd: number) => (sd > 0 ? (x - mean) / sd : 0);

/** Abramowitz & Stegun 7.1.26 approximation of the error function. */
function erf(x: number): number {
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

/** P(X <= x) for X ~ Normal(mean, sd). */
function normalCdf(x: number, mean: number, sd: number): number {
  if (sd <= 0) return x < mean ? 0 : 1;
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

/** ~95% CI half-width converted to an approximate standard error. */
const seFromCi = (coef: CoefCI) => (coef.ci[1] - coef.ci[0]) / (2 * 1.96);

type Term = { coef: CoefCI; x: number };

/** Sums point estimates and combines term SEs (independent, root-sum-of-squares). */
function combineTerms(terms: Term[]) {
  const point = terms.reduce((sum, t) => sum + t.coef.estimate * t.x, 0);
  const variance = terms.reduce((v, t) => v + (seFromCi(t.coef) * Math.abs(t.x)) ** 2, 0);
  const halfWidth = 1.96 * Math.sqrt(variance);
  return { point, low: point - halfWidth, high: point + halfWidth };
}

type Standardized = { ageZ: number | null; sexX: 0 | 1 | null; baselineZ: number };

function standardizeInput(input: PredictionInput): Standardized {
  const ageMid = input.profile.ageBand ? AGE_MIDPOINT[input.profile.ageBand] : null;
  return {
    ageZ:
      ageMid === null
        ? null
        : standardize(ageMid, STANDARDIZATION.age.mean, STANDARDIZATION.age.sd),
    sexX: input.profile.sex ? SEX_CODE[input.profile.sex] : null,
    baselineZ: standardize(input.baseline, STANDARDIZATION.phq9.mean, STANDARDIZATION.phq9.sd),
  };
}

/** Active linear-predictor terms (with CI) for a given scenario. */
function scenarioTerms(components: ComponentId[], s: Standardized): Term[] {
  const F = FITTED_COEFFICIENTS;
  const c1 = components.includes("followUp") ? 1 : 0;
  const c2 = components.includes("relapsePrevention") ? 1 : 0;
  const terms: Term[] = [
    { coef: F.betaFollowUp, x: c1 },
    { coef: F.betaRelapse, x: c2 },
    { coef: F.betaInteraction, x: c1 * c2 },
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
  /** This component's own contribution to the change score (single-component scenario). */
  adjustedEffect: number;
  activeModerators: { label: L; delta: number }[];
};

export type Range = readonly [number, number];

export type Scenario = {
  key: string;
  components: ComponentId[];
  expectedDrop: number;
  expectedEndpoint: number;
  endpointRange: Range;
  responseProbability: number;
  responseRange: Range;
  remissionProbability: number;
  remissionRange: Range;
};

export function estimateComponents(input: PredictionInput): ComponentEstimate[] {
  const s = standardizeInput(input);
  return CARE_COMPONENTS.map((c) => {
    const isC1 = c.id === "followUp";
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
        label: ["Anpassung nach Alter", "Age adjustment"],
        delta: Number(ageDelta.toFixed(2)),
      });
    }
    if (s.sexX !== null) {
      activeModerators.push({
        label: ["Anpassung nach Geschlecht", "Sex adjustment"],
        delta: Number(sexDelta.toFixed(2)),
      });
    }
    return {
      id: c.id,
      adjustedEffect: Number((c.beta.estimate + ageDelta + sexDelta).toFixed(2)),
      activeModerators,
    };
  });
}

export function predictScenario(
  input: PredictionInput,
  components: ComponentId[],
  key?: string,
): Scenario {
  const s = standardizeInput(input);
  const terms = scenarioTerms(components, s);
  const change = combineTerms(terms);
  // alphaStudy has no CI (not yet supplied) — add its point value only.
  const alpha = FITTED_COEFFICIENTS.alphaStudy;

  const dropPoint = change.point + alpha;
  const dropLow = change.low + alpha;
  const dropHigh = change.high + alpha;

  const endpointPoint = clamp(input.baseline - dropPoint, 0, 27);
  // A larger drop means a lower endpoint, so bounds swap here.
  const endpointLow = clamp(input.baseline - dropHigh, 0, 27);
  const endpointHigh = clamp(input.baseline - dropLow, 0, 27);

  const { sigma } = FITTED_COEFFICIENTS;
  const responseThreshold = input.baseline * (1 - MODEL_META.responseRatio);
  const remissionThreshold = MODEL_META.remissionCutoff;

  const responseAt = (endpoint: number) =>
    clamp(normalCdf(responseThreshold, endpoint, sigma), 0.01, 0.99);
  const remissionAt = (endpoint: number) =>
    clamp(normalCdf(remissionThreshold, endpoint, sigma), 0.01, 0.99);

  return {
    key: key ?? (components.join("+") || "usualCare"),
    components,
    expectedDrop: round1(dropPoint),
    expectedEndpoint: round1(endpointPoint),
    endpointRange: [round1(endpointLow), round1(endpointHigh)],
    responseProbability: responseAt(endpointPoint),
    // Lower endpoint (more improvement) means higher response/remission probability.
    responseRange: [responseAt(endpointHigh), responseAt(endpointLow)],
    remissionProbability: remissionAt(endpointPoint),
    remissionRange: [remissionAt(endpointHigh), remissionAt(endpointLow)],
  };
}

/** Patient characteristics the fitted model actually uses. */
export type PredictorRow = {
  label: L;
  value: L;
  usedFor: L;
  available: boolean;
};

export function describePredictors(input: PredictionInput): PredictorRow[] {
  const p = input.profile;
  return [
    {
      label: ["Ausgangswert PHQ-9", "Baseline PHQ-9"],
      value: [`${input.baseline} von 27`, `${input.baseline} of 27`],
      usedFor: [
        "Geht direkt in das gefittete Modell ein (gamma_phq9).",
        "Enters the fitted model directly (gamma_phq9).",
      ],
      available: true,
    },
    {
      label: ["Alter", "Age"],
      value: p.ageBand ? [p.ageBand, p.ageBand] : dash,
      usedFor: [
        "Geht direkt in das gefittete Modell ein (theta_age und Interaktionsterme).",
        "Enters the fitted model directly (theta_age and the interaction terms).",
      ],
      available: p.ageBand !== null,
    },
    {
      label: ["Geschlecht", "Sex"],
      value: p.sex ? SEX_LABEL[p.sex] : dash,
      usedFor: [
        "Geht direkt in das gefittete Modell ein (theta_sex und Interaktionsterme).",
        "Enters the fitted model directly (theta_sex and the interaction terms).",
      ],
      available: p.sex !== null,
    },
  ];
}

export const PREDICTOR_NOTE: L = [
  "Nur diese Merkmale gehen in das gefittete Modell ein. Weitere im Fragebogen erhobene Angaben dienen ausschließlich der Angebots-Passung, nicht der Schätzung.",
  "Only these characteristics enter the fitted model. Other information collected in the questionnaire is used solely for matching offers, not for the estimate.",
];

export function buildPredictions(input: PredictionInput) {
  const estimates = estimateComponents(input);

  const usual = predictScenario(input, [], "usualCare");

  /** Single components added to usual care, kept in catalogue order (no ranking). */
  const singles = CARE_COMPONENTS.map((c) => ({
    component: c,
    scenario: predictScenario(input, [c.id], c.id),
    estimate: estimates.find((e) => e.id === c.id)!,
  }));

  const configurations = CARE_CONFIGURATIONS.map((config) => ({
    config,
    scenario: predictScenario(input, config.components, config.id),
  }));

  const predictors = describePredictors(input);

  /** Most favourable configuration by estimated endpoint — reported cautiously. */
  const favourable = configurations.reduce((best, cur) =>
    cur.scenario.expectedEndpoint < best.scenario.expectedEndpoint ? cur : best,
  );

  return { estimates, usual, singles, configurations, predictors, favourable };
}
