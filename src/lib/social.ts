import type { L } from "./i18n";
import type { Session } from "./session";

export type SocialOffer = {
  id: string;
  title: L;
  body: L;
  category: L;
  /** Where this kind of offer is typically found in Germany. */
  route: L;
  matches: (s: Session, baseline: number) => boolean;
};

const pref = (s: Session, id: string) => s.profile.preferences.includes(id);

export const SOCIAL_OFFERS: SocialOffer[] = [
  {
    id: "bewegungsgruppe",
    title: ["Bewegungsgruppe oder Reha-Sport", "Movement group or rehabilitation sport"],
    body: [
      "Wöchentliche Gruppen in Sportvereinen, oft von den gesetzlichen Kassen als Präventionskurs bezuschusst (§ 20 SGB V).",
      "Weekly groups at local sports clubs, usually subsidised by statutory health insurers as prevention courses (§ 20 SGB V).",
    ],
    category: ["Bewegung", "Movement"],
    route: [
      "Kursangebote Ihrer Krankenkasse, Sportvereine am Wohnort",
      "Course catalogue of your health insurer, local sports clubs",
    ],
    matches: (s) => s.profile.mobilityLimited !== "yes" || pref(s, "activity"),
  },
  {
    id: "wassergymnastik",
    title: ["Wassergymnastik / sanfte Bewegung", "Water gymnastics / gentle movement"],
    body: [
      "Gelenkschonende Gruppenangebote, geeignet bei Schmerzen, Übergewicht oder eingeschränkter Beweglichkeit.",
      "Joint-friendly group offers, suitable with pain, higher weight or limited mobility.",
    ],
    category: ["Bewegung", "Movement"],
    route: ["Schwimmbäder, Volkshochschule, Krankenkasse", "Public pools, adult education centres, insurer"],
    matches: (s) => s.profile.mobilityLimited === "yes" || s.profile.chronicIllness === "yes",
  },
  {
    id: "selbsthilfegruppe",
    title: ["Selbsthilfegruppe Depression", "Depression peer support group"],
    body: [
      "Austausch mit Menschen in ähnlicher Situation, kostenlos und ohne Anmeldung bei der Praxis.",
      "Exchange with people in a similar situation, free of charge and without a referral.",
    ],
    category: ["Austausch", "Peer support"],
    route: [
      "NAKOS-Datenbank, Selbsthilfekontaktstelle im Landkreis",
      "NAKOS database, regional self-help contact point",
    ],
    matches: (s) => s.profile.lowSupport === "yes" || s.profile.livingAlone === "yes" || pref(s, "group"),
  },
  {
    id: "sozialberatung",
    title: ["Soziale Beratung (Schulden, Wohnen, Arbeit)", "Social advice (debt, housing, work)"],
    body: [
      "Kostenlose Beratungsstellen der Wohlfahrtsverbände helfen bei Belastungen, die die Stimmung aufrechterhalten.",
      "Free advice centres run by welfare organisations help with burdens that keep low mood going.",
    ],
    category: ["Beratung", "Advice"],
    route: [
      "Caritas, Diakonie, AWO, Sozialamt der Gemeinde",
      "Caritas, Diakonie, AWO, municipal social services",
    ],
    matches: (s) => s.profile.workStrain === "yes",
  },
  {
    id: "gemeinschaft",
    title: ["Nachbarschafts- und Gemeinschaftsangebote", "Neighbourhood and community offers"],
    body: [
      "Offene Treffs, Gemeinschaftsgärten, Repair-Cafés oder Ehrenamt – niedrigschwellig und ohne Kosten.",
      "Drop-in cafés, community gardens, repair cafés or volunteering — low-threshold and free.",
    ],
    category: ["Teilhabe", "Participation"],
    route: [
      "Mehrgenerationenhäuser, Stadtteilzentren, Freiwilligenagenturen",
      "Community centres, neighbourhood hubs, volunteering agencies",
    ],
    matches: (s) => s.profile.livingAlone === "yes" || pref(s, "group"),
  },
  {
    id: "onlineprogramm",
    title: ["Digitale Gesundheitsanwendung (DiGA)", "Prescribable digital health app (DiGA)"],
    body: [
      "Von der Praxis verordnungsfähige Programme gegen Depression, von der gesetzlichen Kasse bezahlt.",
      "Programmes for depression that your practice can prescribe, covered by statutory insurance.",
    ],
    category: ["Digital", "Digital"],
    route: ["DiGA-Verzeichnis des BfArM, Verordnung in der Praxis", "BfArM DiGA directory, prescription at the practice"],
    matches: (s, baseline) => pref(s, "digital") || baseline < 20,
  },
  {
    id: "entspannung",
    title: ["Stressbewältigungs- oder Achtsamkeitskurs", "Stress management or mindfulness course"],
    body: [
      "Achtwöchige Kurse an Volkshochschulen und bei Kassen, meist zu großen Teilen erstattet.",
      "Eight-week courses at adult education centres and insurers, usually largely reimbursed.",
    ],
    category: ["Kurse", "Courses"],
    route: ["Volkshochschule, Präventionskurse der Krankenkasse", "Adult education centre, insurer prevention courses"],
    matches: (s) => s.profile.workStrain === "yes" || pref(s, "activity"),
  },
  {
    id: "seniorentreff",
    title: ["Senioren- und Begegnungstreffs", "Senior and social meeting points"],
    body: [
      "Regelmäßige Treffen, gemeinsame Mahlzeiten und Ausflüge, häufig mit Fahrdienst.",
      "Regular meet-ups, shared meals and outings, often with a transport service.",
    ],
    category: ["Teilhabe", "Participation"],
    route: ["Gemeinde, Seniorenbüro, Kirchengemeinden", "Municipality, senior citizens' office, parishes"],
    matches: (s) => s.profile.ageBand === "65+",
  },
  {
    id: "angehoerige",
    title: ["Angebote für Angehörige", "Offers for family and carers"],
    body: [
      "Informationsabende und Gruppen für Partner*innen und Familie entlasten das Umfeld und stabilisieren die Behandlung.",
      "Information evenings and groups for partners and family relieve those close to you and stabilise treatment.",
    ],
    category: ["Austausch", "Peer support"],
    route: ["Sozialpsychiatrischer Dienst, Angehörigenverbände", "Community mental health service, carer associations"],
    matches: (s) => s.profile.livingAlone === "no",
  },
];

export const matchOffers = (s: Session, baseline: number) =>
  SOCIAL_OFFERS.filter((o) => o.matches(s, baseline));

export const CRISIS_CONTACTS: { name: L; detail: string; note: L }[] = [
  {
    name: ["Notruf", "Emergency services"],
    detail: "112",
    note: ["Bei akuter Lebensgefahr", "In acute danger to life"],
  },
  {
    name: ["Telefonseelsorge", "Telephone counselling"],
    detail: "0800 111 0 111 / 0800 111 0 222",
    note: ["Kostenlos, rund um die Uhr, anonym", "Free, 24/7, anonymous"],
  },
  {
    name: ["Ärztlicher Bereitschaftsdienst", "Out-of-hours medical service"],
    detail: "116 117",
    note: ["Außerhalb der Praxiszeiten", "Outside practice opening hours"],
  },
  {
    name: ["Info-Telefon Depression", "Depression information line"],
    detail: "0800 33 44 533",
    note: ["Deutsche Depressionshilfe", "German Depression Aid"],
  },
];
