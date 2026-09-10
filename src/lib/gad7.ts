import type { L } from "./i18n";

/** GAD-7 uses the same 4-point response scale and recall period as the PHQ-9. */
export { PHQ9_OPTIONS as GAD7_OPTIONS } from "./phq9";

export const GAD7_INTRO: L = [
  "Wie oft haben Sie sich in den letzten zwei Wochen durch die folgenden Beschwerden beeinträchtigt gefühlt?",
  "Over the last two weeks, how often have you been bothered by any of the following problems?",
];

export const GAD7_ITEMS: L[] = [
  ["Nervosität, Ängstlichkeit oder Anspannung", "Feeling nervous, anxious, or on edge"],
  [
    "Nicht in der Lage sein, Sorgen zu stoppen oder zu kontrollieren",
    "Not being able to stop or control worrying",
  ],
  [
    "Übermäßige Sorgen bezüglich verschiedener Angelegenheiten",
    "Worrying too much about different things",
  ],
  ["Schwierigkeiten, sich zu entspannen", "Trouble relaxing"],
  ["So ruhelos, dass Stillsitzen schwerfällt", "Being so restless that it is hard to sit still"],
  ["Schnell verärgert oder gereizt sein", "Becoming easily annoyed or irritable"],
  [
    "Angst, als ob etwas Schlimmes passieren könnte",
    "Feeling afraid, as if something awful might happen",
  ],
];

/** Sums the 7 item answers (0-3 each) into the GAD-7 total, 0-21. */
export const gad7Total = (answers: (number | null)[]) =>
  answers.slice(0, 7).reduce<number>((sum, a) => sum + (a ?? 0), 0);

export const GAD7_MIN = 0;
export const GAD7_MAX = 21;
