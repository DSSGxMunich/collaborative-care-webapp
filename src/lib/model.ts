/**
 * Depression-care outcome model — fitted coefficients (Bayesian, az.summary()).
 * ----------------------------------------------------------------------------
 * FITTED_COEFFICIENTS below are the real posterior means (with 95% HDI /
 * credible intervals) from the fitted IPD meta-analysis model.
 * `STANDARDIZATION` is now real too — the mean/SD of baseline PHQ-9 and age
 * in the training data (analysis_df), used to standardize both before
 * applying gamma_phq9 / theta_age / the delta_c*_age terms, exactly as the
 * model was fit. `SEX_CODE` — which sex category the model treats as the
 * 0/reference level — is now confirmed: Male = 0, Female = 1.
 *
 * `alphaStudy` (the population-level intercept) is now real, but it is an
 * APPROXIMATION: az.summary() reported a separate posterior mean per trial
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
 * This sign convention (rather than change = baseline - endpoint) is
 * inferred, not confirmed against the fitting script: alpha_study is
 * consistently negative across all 12 reported trials (-3.8 to -1.0),
 * which is only clinically plausible if negative alpha_study means usual
 * care improves PHQ-9 on average — the alternative (positive = improvement)
 * would mean usual-care patients got worse in nearly every included trial.
 * If this turns out to be wrong, negate `change` everywhere it's used below.
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
 * interval — treat it as indicative, not exact. `alphaStudy`'s own
 * between-trial uncertainty is not folded into this range (see above).
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

// Sex: Male = 0, Female = 1
export const SEX_CODE: Record<Sex, 0 | 1> = { male: 0, female: 1 };

/** Representative age (years) used to standardize each age band. */
const AGE_MIDPOINT: Record<NonNullable<Profile["ageBand"]>, number> = {
  "18-29": 24,
  "30-49": 40,
  "50-64": 57,
  "65+": 72,
};

export const MODEL_META = {
  followUpMonths: 6,
  version: "0.5-fitted",
  remissionCutoff: 5,
  /** Response = >= 50% symptom reduction relative to baseline. */
  responseRatio: 0.5,
};

/** Shown wherever numbers appear. */
export const PROTOTYPE_NOTE: L = [
  "Alle Koeffizienten sowie die Standardisierung von Alter und PHQ-9 stammen aus dem gefitteten Modell der IPD-Metaanalyse (einschließlich des Achsenabschnitts, gemittelt über die eingeschlossenen Studien).",
  "All coefficients and the age/PHQ-9 standardization come from the fitted IPD meta-analysis model (including the intercept, averaged across the included trials).",
];

export const COMPONENT_NOTE: L = [
  "Diese beiden Bausteine sind im Modell direkt geschätzt, einschließlich ihres kombinierten Effekts.",
  "These two components are directly estimated in the model, including their combined effect.",
];

const dash: L = ["keine Angabe", "not provided"];
const SEX_LABEL: Record<Sex, L> = { female: ["weiblich", "Female"], male: ["männlich", "Male"] };

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
    label: [
      "Nachverfolgungstermin innerhalb von 2–4 Wochen",
      "Follow-up appointment within 2–4 weeks",
    ],
    short: ["Nachverfolgung (2–4 Wochen)", "Follow-up (2–4 weeks)"],
    description: [
      "Ein Termin oder Kontakt zur Nachverfolgung ist fest für 2 bis 4 Wochen nach der Erstvorstellung eingeplant, auch telefonisch.",
      "A follow-up appointment or contact — in person or by telephone — is firmly scheduled for 2 to 4 weeks after the initial visit.",
    ],
    beta: FITTED_COEFFICIENTS.betaFollowUp,
  },
  {
    id: "relapsePrevention",
    label: ["Strukturierter Rückfallpräventionsplan", "Structured relapse-prevention plan"],
    short: ["Rückfallpräventionsplan", "Relapse-prevention plan"],
    description: [
      "Ein schriftlicher Plan legt fest, wie ein Wiederauftreten der Beschwerden früh erkannt und ihm vorgebeugt wird.",
      "A written plan sets out how a recurrence of symptoms is detected early and prevented.",
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
    label: ["Nachverfolgung (2–4 Wochen)", "Follow-up (2–4 weeks)"],
    description: [
      "Nur der Baustein Nachverfolgungstermin innerhalb von 2–4 Wochen, zusätzlich zur üblichen Versorgung.",
      "Only the follow-up-within-2–4-weeks component, in addition to usual care.",
    ],
    components: ["followUp"],
    dataSupport: "estimable",
    dataNote: [
      "Direkt geschätzter Haupteffekt (beta_component[follow_up_2_4_weeks]).",
      "Directly estimated main effect (beta_component[follow_up_2_4_weeks]).",
    ],
  },
  {
    id: "relapsePrevention",
    label: ["Rückfallpräventionsplan", "Relapse-prevention plan"],
    description: [
      "Nur der Baustein strukturierter Rückfallpräventionsplan, zusätzlich zur üblichen Versorgung.",
      "Only the structured relapse-prevention-plan component, in addition to usual care.",
    ],
    components: ["relapsePrevention"],
    dataSupport: "estimable",
    dataNote: [
      "Direkt geschätzter Haupteffekt (beta_component[relapse_prevention_plan]).",
      "Directly estimated main effect (beta_component[relapse_prevention_plan]).",
    ],
  },
  {
    id: "combined",
    label: [
      "Nachverfolgung und Rückfallpräventionsplan kombiniert",
      "Follow-up and relapse-prevention plan combined",
    ],
    description: [
      "Beide Bausteine gemeinsam, einschließlich ihres gefitteten Interaktionseffekts.",
      "Both components together, including their fitted interaction effect.",
    ],
    components: ["followUp", "relapsePrevention"],
    dataSupport: "estimable",
    dataNote: [
      "Enthält den direkt geschätzten Interaktionsterm (beta_component_interaction).",
      "Includes the directly estimated interaction term (beta_component_interaction).",
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
  // alphaStudy has no CI (only per-trial point estimates were supplied,
  // no pooled hyperparameter) — add its point value only, see file header.
  const alpha = FITTED_COEFFICIENTS.alphaStudy;

  // Fitted outcome = (endpoint - baseline), negative = improvement. This
  // matches alpha_study being consistently negative across every trial
  // (average usual-care improvement), not consistently positive
  // (which would mean usual care makes people worse in nearly every trial).
  const rawChangePoint = change.point + alpha;
  const rawChangeLow = change.low + alpha;
  const rawChangeHigh = change.high + alpha;

  const endpointPoint = clamp(input.baseline + rawChangePoint, 0, 27);
  const endpointLow = clamp(input.baseline + rawChangeLow, 0, 27);
  const endpointHigh = clamp(input.baseline + rawChangeHigh, 0, 27);

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
    // expectedDrop: positive = symptom reduction (opposite sign of rawChange).
    expectedDrop: round1(-rawChangePoint),
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
