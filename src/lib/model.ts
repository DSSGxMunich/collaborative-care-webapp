/**
 * Transparent, rule-based prototype model for components of structured /
 * collaborative depression care.
 * ----------------------------------------------------------------------------
 * RESEARCH PROTOTYPE — every number in this file is an ILLUSTRATIVE PLACEHOLDER
 * used to test the user interface. None of these values is an output of the IPD
 * meta-analysis. Replace the parameters below once the pooled model exists;
 * nothing else in the application needs to change.
 *
 * Structure (component contributions with diminishing returns):
 *
 *   expectedDrop = usualCareDrop(baseline)
 *                + Σ_i  w_i * componentEffect_i * Π_j moderator_ij
 *
 *   Configurations (care packages) are NOT sums of single components: the
 *   weights w_i = 1, 0.6, 0.4, 0.25, 0.15, 0.1 shrink each additional
 *   component, and each configuration is presented as one distinct care
 *   arrangement rather than as "component A + component B".
 *
 *   P(response)  = logistic(a + b * (expectedDrop / baseline - 0.5))
 *   P(remission) = logistic(a' + b' * endpoint)      // endpoint < 5 target
 */

import type { L } from "./i18n";
import type { Profile } from "./session";

export type ComponentId =
  | "careManager"
  | "monitoring"
  | "education"
  | "followUp"
  | "specialistConsult"
  | "coordination";

export type PredictionInput = {
  baseline: number;
  functioning: number | null;
  profile: Profile;
};

export type Moderator = {
  id: string;
  label: L;
  factor: number;
  applies: (c: PredictionInput) => boolean;
};

export type CareComponent = {
  id: ComponentId;
  label: L;
  short: L;
  description: L;
  /** Illustrative additional PHQ-9 point reduction vs. usual GP care. */
  effect: number;
  moderators: Moderator[];
};

export const MODEL_META = {
  followUpMonths: 6,
  pooledSd: 5.5,
  version: "0.2-prototype (illustrative values)",
  remissionCutoff: 5,
  combinationWeights: [1, 0.6, 0.4, 0.25, 0.15, 0.1],
  usualCare: { intercept: 3.1, baselineSlope: 0.17 },
  /** Response = >=50% symptom reduction; modelled on the relative reduction. */
  response: { intercept: -0.25, ratioSlope: 8.0 },
  remission: { intercept: 2.4, endpointSlope: -0.34 },
  /** Illustrative uncertainty, widened for configurations with more components. */
  uncertainty: { endpoint: 2.5, endpointPerComponent: 0.4, probability: 0.1 },
};

/** Shown wherever numbers appear. */
export const PROTOTYPE_NOTE: L = [
  "Forschungsprototyp – illustrative Modellwerte. Die dargestellten Schätzungen dienen der Erprobung der Benutzeroberfläche und werden später durch Ergebnisse der IPD-Metaanalyse ersetzt.",
  "Research prototype — illustrative model values. The estimates shown serve to test the user interface and will later be replaced by results of the IPD meta-analysis.",
];

export const COMPONENT_NOTE: L = [
  "Beispielhafte Prototyp-Bausteine. Welche Bausteine am Ende dargestellt werden, hängt davon ab, was aus den Studiendaten der IPD-Metaanalyse harmonisiert und geschätzt werden kann.",
  "Example prototype components. Which components are finally shown depends on what can be harmonised and estimated from the trial data in the IPD meta-analysis.",
];

const has = (list: string[], id: string) => list.includes(id);
const priorTx = (c: PredictionInput, id: string) => has(c.profile.priorTreatment, id);

export const CARE_COMPONENTS: CareComponent[] = [
  {
    id: "careManager",
    label: ["Begleitung durch eine Care-/Fallmanagerin", "Care/case manager support"],
    short: ["Care-Management", "Care management"],
    description: [
      "Eine feste, geschulte Ansprechperson in der Praxis begleitet den Verlauf, hält Kontakt und koordiniert die nächsten Schritte.",
      "A named, trained contact person in the practice follows the course of illness, keeps in touch and organises the next steps.",
    ],
    effect: 1.8,
    moderators: [
      {
        id: "duration",
        label: ["Beschwerden länger als 12 Monate", "Symptoms for more than 12 months"],
        factor: 1.15,
        applies: (c) => c.profile.duration === "gt12m",
      },
      {
        id: "comorbidity",
        label: ["Zusätzliche körperliche Erkrankung", "Additional physical illness"],
        factor: 1.2,
        applies: (c) => c.profile.chronicIllness === "yes",
      },
      {
        id: "support",
        label: ["Wenig soziale Unterstützung", "Little social support"],
        factor: 1.15,
        applies: (c) => c.profile.lowSupport === "yes",
      },
    ],
  },
  {
    id: "monitoring",
    label: ["Regelmäßige Verlaufsmessung (z. B. PHQ-9)", "Regular symptom monitoring (e.g. PHQ-9)"],
    short: ["Verlaufsmessung", "Symptom monitoring"],
    description: [
      "Die Beschwerden werden in festen Abständen mit einem Fragebogen erfasst, damit Veränderungen früh sichtbar werden.",
      "Symptoms are measured at fixed intervals with a questionnaire so that changes become visible early.",
    ],
    effect: 1.1,
    moderators: [
      {
        id: "recurrent",
        label: ["Frühere depressive Episoden", "Previous depressive episodes"],
        factor: 1.15,
        applies: (c) => c.profile.priorEpisodes === "yes",
      },
      {
        id: "severe",
        label: ["Ausgangswert PHQ-9 ≥ 20", "Baseline PHQ-9 ≥ 20"],
        factor: 1.1,
        applies: (c) => c.baseline >= 20,
      },
    ],
  },
  {
    id: "education",
    label: [
      "Patientenschulung und Unterstützung beim Selbstmanagement",
      "Patient education and self-management support",
    ],
    short: ["Schulung & Selbstmanagement", "Education & self-management"],
    description: [
      "Verständliche Informationen zur Erkrankung, zu Behandlungsmöglichkeiten und Anleitung, im Alltag selbst wirksam zu werden.",
      "Understandable information about the condition and treatment options, plus guidance to become effective in everyday life.",
    ],
    effect: 1.2,
    moderators: [
      {
        id: "milder",
        label: ["Ausgangswert PHQ-9 < 15", "Baseline PHQ-9 < 15"],
        factor: 1.15,
        applies: (c) => c.baseline < 15,
      },
      {
        id: "early",
        label: ["Beschwerden erst seit kurzem", "Symptoms only recently present"],
        factor: 1.1,
        applies: (c) => c.profile.duration === "lt3m",
      },
      {
        id: "older",
        label: ["Alter 65+", "Age 65+"],
        factor: 0.9,
        applies: (c) => c.profile.ageBand === "65+",
      },
    ],
  },
  {
    id: "followUp",
    label: ["Strukturierte Wiedervorstellung / Nachverfolgung", "Structured follow-up"],
    short: ["Strukturierte Nachverfolgung", "Structured follow-up"],
    description: [
      "Termine und Rückmeldungen sind im Voraus geplant, auch telefonisch; niemand fällt aus der Behandlung heraus.",
      "Appointments and check-backs are planned in advance, also by telephone, so nobody drops out of care.",
    ],
    effect: 1.0,
    moderators: [
      {
        id: "medication",
        label: ["Laufende oder frühere medikamentöse Behandlung", "Current or previous medication"],
        factor: 1.15,
        applies: (c) => priorTx(c, "antidepressant"),
      },
      {
        id: "substance",
        label: ["Riskanter Alkohol-/Substanzkonsum", "Risky alcohol or substance use"],
        factor: 1.1,
        applies: (c) => c.profile.substanceUse === "yes",
      },
    ],
  },
  {
    id: "specialistConsult",
    label: [
      "Fachärztlich-psychiatrische oder psychologische Mitbeurteilung / Supervision",
      "Specialist psychiatric or psychological consultation / supervision",
    ],
    short: ["Fachliche Mitbeurteilung", "Specialist consultation"],
    description: [
      "Die Praxis holt regelmäßig fachliche Einschätzung ein, ohne dass Sie dafür zwingend selbst eine Fachpraxis aufsuchen müssen.",
      "The practice regularly obtains specialist input, without you necessarily having to attend a specialist service yourself.",
    ],
    effect: 1.3,
    moderators: [
      {
        id: "severe",
        label: ["Ausgangswert PHQ-9 ≥ 20", "Baseline PHQ-9 ≥ 20"],
        factor: 1.25,
        applies: (c) => c.baseline >= 20,
      },
      {
        id: "priorTreatment",
        label: ["Bereits behandelt, ohne ausreichende Besserung", "Already treated without sufficient improvement"],
        factor: 1.2,
        applies: (c) => priorTx(c, "psychotherapy") || priorTx(c, "inpatient"),
      },
      {
        id: "mild",
        label: ["Ausgangswert PHQ-9 < 10", "Baseline PHQ-9 < 10"],
        factor: 0.75,
        applies: (c) => c.baseline < 10,
      },
    ],
  },
  {
    id: "coordination",
    label: [
      "Abstimmung und Kommunikation zwischen den Behandelnden",
      "Coordination and communication between providers",
    ],
    short: ["Abstimmung im Team", "Provider coordination"],
    description: [
      "Praxis, Fachpraxis und weitere Beteiligte tauschen Befunde und Pläne aktiv aus, statt parallel zu arbeiten.",
      "Practice, specialist services and others actively exchange findings and plans instead of working in parallel.",
    ],
    effect: 0.8,
    moderators: [
      {
        id: "comorbidity",
        label: ["Mehrere Behandelnde wegen Begleiterkrankung", "Several providers due to comorbidity"],
        factor: 1.25,
        applies: (c) => c.profile.chronicIllness === "yes",
      },
      {
        id: "inpatient",
        label: ["Frühere Klinikbehandlung", "Previous inpatient treatment"],
        factor: 1.2,
        applies: (c) => priorTx(c, "inpatient"),
      },
    ],
  },
];

export const componentById = (id: ComponentId): CareComponent =>
  CARE_COMPONENTS.find((c) => c.id === id)!;

/** Distinct care configurations, not additive sums of components. */
export type ConfigurationId =
  | "usualCare"
  | "cmMonitoring"
  | "cmMonitoringEducation"
  | "multiComponent";

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
    "In der IPD-Analyse voraussichtlich schätzbar",
    "Likely estimable in the IPD analysis",
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
      "Referenzgruppe der eingeschlossenen Studien.",
      "Reference group of the included trials.",
    ],
  },
  {
    id: "cmMonitoring",
    label: ["Care-Management mit regelmäßiger Verlaufsmessung", "Care management with regular monitoring"],
    description: [
      "Feste Ansprechperson in der Praxis plus Fragebogen-Verlaufsmessung in festen Abständen.",
      "A named contact person in the practice plus questionnaire-based monitoring at fixed intervals.",
    ],
    components: ["careManager", "monitoring"],
    dataSupport: "estimable",
    dataNote: [
      "Häufige Konstellation in Collaborative-Care-Studien.",
      "A frequent constellation in collaborative care trials.",
    ],
  },
  {
    id: "cmMonitoringEducation",
    label: [
      "Care-Management, Verlaufsmessung und Patientenschulung",
      "Care management, monitoring and patient education",
    ],
    description: [
      "Wie oben, ergänzt um strukturierte Information und Unterstützung beim Selbstmanagement.",
      "As above, extended by structured information and self-management support.",
    ],
    components: ["careManager", "monitoring", "education"],
    dataSupport: "partial",
    dataNote: [
      "Schulungsanteile sind in den Studien unterschiedlich beschrieben.",
      "Education elements are described heterogeneously across trials.",
    ],
  },
  {
    id: "multiComponent",
    label: ["Mehrkomponentige Collaborative Care", "Multi-component collaborative care"],
    description: [
      "Vollständiges Modell: Care-Management, Verlaufsmessung, Schulung, geplante Nachverfolgung, fachliche Mitbeurteilung und Abstimmung im Team.",
      "Full model: care management, monitoring, education, planned follow-up, specialist input and coordination between providers.",
    ],
    components: ["careManager", "monitoring", "education", "followUp", "specialistConsult", "coordination"],
    dataSupport: "partial",
    dataNote: [
      "Studien setzen unterschiedliche Teile dieses Modells um; die Kombination wird nur dort geschätzt, wo die Studiendaten sie tragen.",
      "Trials implement different parts of this model; the combination will only be estimated where the trial data support it.",
    ],
  },
];

export const COMBINATION_NOTE: L = [
  "Versorgungsformen sind hier als eigenständige Konfigurationen dargestellt, nicht als Summe einzelner Bausteine. Endgültige Schätzungen für Kombinationen entstehen in der IPD-Analyse nur dort, wo die verfügbaren Studiendaten diese Konfiguration abbilden.",
  "Care arrangements are shown as distinct configurations, not as sums of single components. Final estimates for combinations will be produced in the IPD analysis only where the available trial data cover that configuration.",
];

const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export type ComponentEstimate = {
  id: ComponentId;
  adjustedEffect: number;
  activeModerators: { label: L; factor: number }[];
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

export const usualCareDrop = (baseline: number) =>
  baseline <= 0
    ? 0
    : Math.max(0, MODEL_META.usualCare.intercept + MODEL_META.usualCare.baselineSlope * baseline);

export function estimateComponents(input: PredictionInput): ComponentEstimate[] {
  return CARE_COMPONENTS.map((c) => {
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
  key?: string,
): Scenario {
  const picked = components
    .map((id) => estimates.find((e) => e.id === id)?.adjustedEffect ?? 0)
    .sort((a, b) => b - a);

  const combined = picked.reduce(
    (sum, eff, i) => sum + eff * (MODEL_META.combinationWeights[i] ?? 0.08),
    0,
  );

  const drop = clamp(usualCareDrop(input.baseline) + combined, 0, input.baseline);
  const endpoint = Math.max(0, input.baseline - drop);

  const ratio = drop / Math.max(input.baseline, 1);
  const response = clamp(
    logistic(MODEL_META.response.intercept + MODEL_META.response.ratioSlope * (ratio - 0.5)),
    0.02,
    0.95,
  );
  const remission = clamp(
    logistic(MODEL_META.remission.intercept + MODEL_META.remission.endpointSlope * endpoint),
    0.02,
    0.92,
  );

  const spread =
    MODEL_META.uncertainty.endpoint +
    MODEL_META.uncertainty.endpointPerComponent * components.length;
  const pSpread = MODEL_META.uncertainty.probability + 0.01 * components.length;

  const round1 = (x: number) => Number(x.toFixed(1));

  return {
    key: key ?? (components.join("+") || "usualCare"),
    components,
    expectedDrop: round1(drop),
    expectedEndpoint: round1(endpoint),
    endpointRange: [round1(Math.max(0, endpoint - spread)), round1(Math.min(27, endpoint + spread))],
    responseProbability: response,
    responseRange: [clamp(response - pSpread, 0.01, 1), clamp(response + pSpread, 0, 0.98)],
    remissionProbability: remission,
    remissionRange: [clamp(remission - pSpread, 0.01, 1), clamp(remission + pSpread, 0, 0.96)],
  };
}

/** Patient characteristics the model uses to find "similar profiles". */
export type PredictorRow = {
  label: L;
  value: L;
  usedFor: L;
  available: boolean;
};

const YN: Record<string, L> = { yes: ["ja", "yes"], no: ["nein", "no"] };
const DURATION: Record<string, L> = {
  lt3m: ["weniger als 3 Monate", "less than 3 months"],
  "3to12m": ["3 bis 12 Monate", "3 to 12 months"],
  gt12m: ["länger als 12 Monate", "longer than 12 months"],
};
const dash: L = ["keine Angabe", "not provided"];

export function describePredictors(input: PredictionInput): PredictorRow[] {
  const p = input.profile;
  return [
    {
      label: ["Ausgangswert PHQ-9", "Baseline PHQ-9"],
      value: [`${input.baseline} von 27`, `${input.baseline} of 27`],
      usedFor: [
        "Bestimmt den erwarteten Verlauf und die Nähe zur Remissionsgrenze.",
        "Determines the expected course and the distance to the remission threshold.",
      ],
      available: true,
    },
    {
      label: ["Beeinträchtigung im Alltag", "Impairment in daily life"],
      value:
        input.functioning === null
          ? dash
          : [`${input.functioning} von 3`, `${input.functioning} of 3`],
      usedFor: [
        "Beschreibt die Funktionsebene; in der IPD-Analyse als zusätzlicher Prädiktor vorgesehen.",
        "Describes functioning; planned as an additional predictor in the IPD analysis.",
      ],
      available: input.functioning !== null,
    },
    {
      label: ["Dauer der aktuellen Beschwerden", "Duration of current symptoms"],
      value: p.duration ? DURATION[p.duration]! : dash,
      usedFor: [
        "Länger bestehende Beschwerden verändern die geschätzten Ergebnisse strukturierter Begleitung.",
        "Longer-standing symptoms change the estimated outcomes of structured support.",
      ],
      available: p.duration !== null,
    },
    {
      label: ["Frühere depressive Episoden", "Previous depressive episodes"],
      value: p.priorEpisodes ? YN[p.priorEpisodes]! : dash,
      usedFor: [
        "Wiederkehrende Episoden gehen mit anderen Verläufen einher.",
        "Recurrent episodes are associated with different courses.",
      ],
      available: p.priorEpisodes !== null,
    },
    {
      label: ["Bisherige Behandlungen", "Previous treatments"],
      value:
        p.priorTreatment.length > 0
          ? [p.priorTreatment.join(", "), p.priorTreatment.join(", ")]
          : dash,
      usedFor: [
        "Vorbehandlung ist ein Prädiktor für den weiteren Verlauf, z. B. bei bereits erfolglosen Behandlungsversuchen.",
        "Previous treatment is a predictor of further course, e.g. after treatment attempts without sufficient success.",
      ],
      available: p.priorTreatment.length > 0,
    },
    {
      label: ["Alter", "Age"],
      value: p.ageBand ? [p.ageBand, p.ageBand] : dash,
      usedFor: [
        "Altersgruppe, soweit sie in den Studiendaten mit dem Verlauf zusammenhängt.",
        "Age group, insofar as it relates to outcome in the trial data.",
      ],
      available: p.ageBand !== null,
    },
    {
      label: ["Körperliche Begleiterkrankung", "Physical comorbidity"],
      value: p.chronicIllness ? YN[p.chronicIllness]! : dash,
      usedFor: [
        "Komorbidität ist einer der am häufigsten berichteten Prädiktoren.",
        "Comorbidity is one of the most frequently reported predictors.",
      ],
      available: p.chronicIllness !== null,
    },
    {
      label: ["Soziale Unterstützung / Lebenssituation", "Social support / living situation"],
      value:
        p.lowSupport || p.livingAlone
          ? [
              `${p.livingAlone === "yes" ? "lebt allein" : "lebt nicht allein"}, ${
                p.lowSupport === "yes" ? "wenig Unterstützung" : "Unterstützung vorhanden"
              }`,
              `${p.livingAlone === "yes" ? "lives alone" : "does not live alone"}, ${
                p.lowSupport === "yes" ? "little support" : "support available"
              }`,
            ]
          : dash,
      usedFor: [
        "Kontextmerkmal, das in mehreren Studien mit dem Verlauf zusammenhängt.",
        "Context characteristic related to outcome in several trials.",
      ],
      available: p.lowSupport !== null,
    },
    {
      label: ["Alkohol-/Substanzkonsum", "Alcohol or substance use"],
      value: p.substanceUse ? YN[p.substanceUse]! : dash,
      usedFor: [
        "Wird als Prädiktor und als Hinweis auf Behandlungsbedarf berücksichtigt.",
        "Considered as a predictor and as an indication of treatment need.",
      ],
      available: p.substanceUse !== null,
    },
  ];
}

export const PREDICTOR_NOTE: L = [
  "Diese Merkmale werden vom Modell genutzt, um Ergebnisse für Personen mit ähnlichem Profil zu schätzen. Sie erklären nicht, warum eine Versorgungsform bei Ihnen persönlich besser wirkt – es handelt sich um statistische Zusammenhänge, nicht um nachgewiesene Ursachen.",
  "These characteristics are used by the model to estimate outcomes for people with a similar profile. They do not explain why one form of care works better for you personally — these are statistical associations, not established causes.",
];

export function buildPredictions(input: PredictionInput) {
  const estimates = estimateComponents(input);

  const usual = predictScenario(input, [], estimates, "usualCare");

  /** Single components added to usual care, kept in catalogue order (no ranking). */
  const singles = CARE_COMPONENTS.map((c) => ({
    component: c,
    scenario: predictScenario(input, [c.id], estimates, c.id),
    estimate: estimates.find((e) => e.id === c.id)!,
  }));

  const configurations = CARE_CONFIGURATIONS.map((config) => ({
    config,
    scenario: predictScenario(input, config.components, estimates, config.id),
  }));

  const predictors = describePredictors(input);

  /** Most favourable configuration by estimated endpoint — reported cautiously. */
  const favourable = configurations.reduce((best, cur) =>
    cur.scenario.expectedEndpoint < best.scenario.expectedEndpoint ? cur : best,
  );

  return { estimates, usual, singles, configurations, predictors, favourable };
}
