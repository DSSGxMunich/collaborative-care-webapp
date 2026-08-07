/**
 * Transparent, rule-based prediction model.
 * ----------------------------------------------------------------------------
 * Every number in this file is an editable model parameter. Replace the values
 * in MODEL with the coefficients from your IPD meta-analysis; nothing else in
 * the application needs to change.
 *
 * Structure (linear-additive with diminishing returns):
 *
 *   expectedDrop = usualCareDrop(baseline)
 *                + Σ_i  w_i * componentEffect_i * Π_j moderator_ij
 *
 *   where w_i are combination weights (1, 0.6, 0.4, 0.25 ...) applied to the
 *   components ordered by adjusted effect size, reflecting the sub-additivity
 *   consistently observed when care components are combined.
 *
 *   P(response)  = logistic(a + b * (expectedDrop / baseline - 0.5))
 *   P(remission) = logistic(a' + b' * (baseline - expectedDrop))
 *
 * Component effects are expressed in PHQ-9 points at ~6 months follow-up
 * (SMD x pooled SD of 5.5). The values below are PROVISIONAL placeholders in
 * the range reported by published collaborative-care / structured depression
 * care meta-analyses and are flagged as such in the interface.
 */

import type { L } from "./i18n";
import type { Profile } from "./session";

export type ComponentId =
  | "usualCare"
  | "caseManagement"
  | "psychotherapy"
  | "antidepressant"
  | "exercise"
  | "digitalSelfHelp"
  | "socialActivation";

export type CareComponent = {
  id: ComponentId;
  label: L;
  short: L;
  description: L;
  /** Additional PHQ-9 point reduction vs. usual care (main effect). */
  effect: number;
  /** Multiplicative moderators applied to the main effect. */
  moderators: { id: string; label: L; factor: number; applies: (c: PredictionInput) => boolean }[];
};

export type PredictionInput = {
  baseline: number;
  functioning: number | null;
  profile: Profile;
};

export const MODEL_META = {
  followUpMonths: 6,
  pooledSd: 5.5,
  version: "0.1-provisional",
  combinationWeights: [1, 0.6, 0.4, 0.25, 0.15],
  usualCare: { intercept: 3.1, baselineSlope: 0.17 },
  /** Response = >=50% symptom reduction; modelled on the relative reduction. */
  response: { intercept: -0.25, ratioSlope: 8.0 },
  remission: { intercept: 2.4, endpointSlope: -0.34 },
};

const has = (list: string[], id: string) => list.includes(id);

export const CARE_COMPONENTS: CareComponent[] = [
  {
    id: "usualCare",
    label: ["Übliche Versorgung", "Usual care"],
    short: ["Übliche Versorgung", "Usual care"],
    description: [
      "Regelmäßige Termine in der Hausarztpraxis, Beratung und Beobachtung des Verlaufs.",
      "Regular appointments with the GP, advice and watchful waiting.",
    ],
    effect: 0,
    moderators: [],
  },
  {
    id: "caseManagement",
    label: [
      "Strukturierte Begleitung (Case Management)",
      "Structured follow-up (case management)",
    ],
    short: ["Strukturierte Begleitung", "Structured follow-up"],
    description: [
      "Feste Ansprechperson in der Praxis, regelmäßige Verlaufskontrollen und Erinnerungen.",
      "A named contact in the practice, scheduled symptom monitoring and reminders.",
    ],
    effect: 1.7,
    moderators: [
      {
        id: "chronic",
        label: ["Beschwerden länger als 12 Monate", "Symptoms for more than 12 months"],
        factor: 1.15,
        applies: (c) => c.profile.duration === "gt12m",
      },
      {
        id: "chronicIllness",
        label: ["Zusätzliche körperliche Erkrankung", "Additional physical illness"],
        factor: 1.2,
        applies: (c) => c.profile.chronicIllness === "yes",
      },
      {
        id: "gpPref",
        label: ["Wunsch nach engerer Begleitung", "Prefers closer follow-up"],
        factor: 1.1,
        applies: (c) => has(c.profile.preferences, "gpLed"),
      },
    ],
  },
  {
    id: "psychotherapy",
    label: ["Psychotherapie / Gesprächsbehandlung", "Psychotherapy / talking treatment"],
    short: ["Psychotherapie", "Psychotherapy"],
    description: [
      "Strukturierte Gespräche, meist verhaltenstherapeutisch, einzeln oder in der Gruppe.",
      "Structured sessions, usually cognitive-behavioural, individually or in a group.",
    ],
    effect: 2.5,
    moderators: [
      {
        id: "pref",
        label: ["Bevorzugt Gespräche", "Prefers talking therapy"],
        factor: 1.15,
        applies: (c) => has(c.profile.preferences, "talking"),
      },
      {
        id: "recurrent",
        label: ["Frühere depressive Episoden", "Previous depressive episodes"],
        factor: 1.1,
        applies: (c) => c.profile.priorEpisodes === "yes",
      },
      {
        id: "severe",
        label: ["Sehr schwere Symptomatik", "Very severe symptoms"],
        factor: 0.9,
        applies: (c) => c.baseline >= 22,
      },
    ],
  },
  {
    id: "antidepressant",
    label: ["Medikamentöse Behandlung", "Antidepressant medication"],
    short: ["Medikamente", "Medication"],
    description: [
      "Antidepressiva, ärztlich verordnet und begleitet, mit Kontrolle von Wirkung und Nebenwirkungen.",
      "Antidepressants prescribed and monitored by a doctor, with review of effects and side effects.",
    ],
    effect: 1.9,
    moderators: [
      {
        id: "severe",
        label: ["Ausgeprägte Symptomatik (PHQ-9 ≥ 20)", "Marked symptoms (PHQ-9 ≥ 20)"],
        factor: 1.3,
        applies: (c) => c.baseline >= 20,
      },
      {
        id: "mild",
        label: ["Leichte Symptomatik (PHQ-9 < 10)", "Mild symptoms (PHQ-9 < 10)"],
        factor: 0.6,
        applies: (c) => c.baseline < 10,
      },
      {
        id: "pref",
        label: ["Offen für Medikamente", "Open to medication"],
        factor: 1.1,
        applies: (c) => has(c.profile.preferences, "medication"),
      },
      {
        id: "substance",
        label: ["Riskanter Alkohol-/Substanzkonsum", "Risky alcohol or substance use"],
        factor: 0.85,
        applies: (c) => c.profile.substanceUse === "yes",
      },
    ],
  },
  {
    id: "exercise",
    label: ["Bewegung & Aktivitätsaufbau", "Exercise & behavioural activation"],
    short: ["Bewegung", "Exercise"],
    description: [
      "Angeleitete Bewegung und schrittweiser Aufbau angenehmer Alltagsaktivitäten.",
      "Supervised physical activity and step-by-step rebuilding of rewarding daily activities.",
    ],
    effect: 1.6,
    moderators: [
      {
        id: "pref",
        label: ["Bevorzugt Bewegung", "Prefers movement"],
        factor: 1.2,
        applies: (c) => has(c.profile.preferences, "activity"),
      },
      {
        id: "mobility",
        label: ["Eingeschränkte Beweglichkeit", "Limited mobility"],
        factor: 0.7,
        applies: (c) => c.profile.mobilityLimited === "yes",
      },
      {
        id: "moderate",
        label: ["Leichte bis mittelgradige Symptomatik", "Mild to moderate symptoms"],
        factor: 1.15,
        applies: (c) => c.baseline < 15,
      },
    ],
  },
  {
    id: "digitalSelfHelp",
    label: ["Begleitetes Selbsthilfe-/Online-Programm", "Guided self-help / online programme"],
    short: ["Selbsthilfe-Programm", "Guided self-help"],
    description: [
      "Digitales oder schriftliches Programm mit kurzer, regelmäßiger Begleitung.",
      "A digital or written programme with brief, regular guidance.",
    ],
    effect: 1.4,
    moderators: [
      {
        id: "pref",
        label: ["Offen für digitale Angebote", "Open to digital offers"],
        factor: 1.2,
        applies: (c) => has(c.profile.preferences, "digital"),
      },
      {
        id: "severe",
        label: ["Ausgeprägte Symptomatik (PHQ-9 ≥ 20)", "Marked symptoms (PHQ-9 ≥ 20)"],
        factor: 0.7,
        applies: (c) => c.baseline >= 20,
      },
      {
        id: "older",
        label: ["Alter 65+", "Age 65+"],
        factor: 0.85,
        applies: (c) => c.profile.ageBand === "65+",
      },
    ],
  },
  {
    id: "socialActivation",
    label: ["Soziale Aktivierung / Social Prescribing", "Social activation / social prescribing"],
    short: ["Soziale Aktivierung", "Social activation"],
    description: [
      "Gezielte Vermittlung in Gruppen, Kurse und Angebote im Wohnumfeld.",
      "Targeted referral into groups, courses and offers in the local area.",
    ],
    effect: 0.9,
    moderators: [
      {
        id: "alone",
        label: ["Lebt allein", "Lives alone"],
        factor: 1.3,
        applies: (c) => c.profile.livingAlone === "yes",
      },
      {
        id: "support",
        label: ["Wenig soziale Unterstützung", "Little social support"],
        factor: 1.35,
        applies: (c) => c.profile.lowSupport === "yes",
      },
      {
        id: "pref",
        label: ["Interesse an Gruppenangeboten", "Interested in group offers"],
        factor: 1.2,
        applies: (c) => has(c.profile.preferences, "group"),
      },
    ],
  },
];

const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export type ComponentEstimate = {
  id: ComponentId;
  adjustedEffect: number;
  activeModerators: { label: L; factor: number }[];
};

export type Scenario = {
  key: string;
  components: ComponentId[];
  expectedDrop: number;
  expectedEndpoint: number;
  responseProbability: number;
  remissionProbability: number;
};

export const usualCareDrop = (baseline: number) =>
  Math.max(
    0,
    MODEL_META.usualCare.intercept + MODEL_META.usualCare.baselineSlope * (baseline - 10),
  );

export function estimateComponents(input: PredictionInput): ComponentEstimate[] {
  return CARE_COMPONENTS.filter((c) => c.id !== "usualCare").map((c) => {
    const active = c.moderators.filter((m) => m.applies(input));
    const factor = active.reduce((f, m) => f * m.factor, 1);
    return {
      id: c.id,
      adjustedEffect: Number((c.effect * factor).toFixed(2)),
      activeModerators: active.map((m) => ({ label: m.label, factor: m.factor })),
    };
  });
}

export function predictScenario(
  input: PredictionInput,
  components: ComponentId[],
  estimates: ComponentEstimate[],
): Scenario {
  const picked = components
    .filter((id) => id !== "usualCare")
    .map((id) => estimates.find((e) => e.id === id)?.adjustedEffect ?? 0)
    .sort((a, b) => b - a);

  const combined = picked.reduce(
    (sum, eff, i) => sum + eff * (MODEL_META.combinationWeights[i] ?? 0.1),
    0,
  );

  const drop = clamp(usualCareDrop(input.baseline) + combined, 0, input.baseline);
  const endpoint = Math.max(0, input.baseline - drop);

  const ratio = drop / Math.max(input.baseline, 1);
  const response = logistic(
    MODEL_META.response.intercept + MODEL_META.response.ratioSlope * (ratio - 0.5),
  );
  const remission = logistic(
    MODEL_META.remission.intercept + MODEL_META.remission.endpointSlope * endpoint,
  );

  return {
    key: components.join("+") || "usualCare",
    components,
    expectedDrop: Number(drop.toFixed(1)),
    expectedEndpoint: Number(endpoint.toFixed(1)),
    responseProbability: clamp(response, 0.02, 0.95),
    remissionProbability: clamp(remission, 0.02, 0.92),
  };
}

/** Ranked single components plus the best two- and three-component packages. */
export function buildPredictions(input: PredictionInput) {
  const estimates = estimateComponents(input);
  const ranked = [...estimates].sort((a, b) => b.adjustedEffect - a.adjustedEffect);

  const usual = predictScenario(input, [], estimates);
  const singles = ranked.map((e) => predictScenario(input, [e.id], estimates));
  const top = ranked.slice(0, 3).map((e) => e.id);
  const pair = predictScenario(input, top.slice(0, 2), estimates);
  const triple = predictScenario(input, top, estimates);

  return { estimates, ranked, usual, singles, pair, triple };
}
