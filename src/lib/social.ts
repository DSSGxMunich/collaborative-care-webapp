import type { L } from "./i18n";
import type { Session } from "./session";

/**
 * Prototype personalisation logic for social prescribing.
 * ----------------------------------------------------------------------------
 * Rule-based and deliberately transparent: questionnaire answers first select
 * relevant CATEGORIES, and only then is the location used to look for
 * geographically relevant services inside those categories.
 */

export type CategoryId =
  | "movement"
  | "peer"
  | "counselling"
  | "digital"
  | "carer"
  | "participation";

export type OfferCategory = {
  id: CategoryId;
  label: L;
  /** Which answer triggers this category — shown to the patient. */
  trigger: (s: Session, baseline: number) => L | null;
};

export const OFFER_CATEGORIES: OfferCategory[] = [
  {
    id: "movement",
    label: ["Bewegung und körperliche Aktivität", "Movement and physical activity"],
    trigger: (s) =>
      s.profile.lowActivity === "yes"
        ? s.profile.mobilityLimited === "yes"
          ? [
              "Sie bewegen sich derzeit wenig und Ihre Beweglichkeit ist eingeschränkt – gelenkschonende Angebote passen dazu.",
              "You are currently not very active and your mobility is limited — joint-friendly offers fit this.",
            ]
          : [
              "Sie haben angegeben, sich derzeit wenig zu bewegen.",
              "You reported being physically inactive at the moment.",
            ]
        : s.profile.preferences.includes("activity")
          ? [
              "Sie können sich Bewegung und Aktivität für sich vorstellen.",
              "You could imagine movement and activity for yourself.",
            ]
          : null,
  },
  {
    id: "peer",
    label: ["Austausch mit anderen / Selbsthilfe", "Peer exchange and self-help"],
    trigger: (s) =>
      s.profile.lowSupport === "yes"
        ? [
            "Sie haben angegeben, dass Ihnen jemand zum Sprechen fehlt.",
            "You reported lacking someone to talk to.",
          ]
        : s.profile.livingAlone === "yes"
          ? ["Sie leben allein.", "You live alone."]
          : s.profile.preferences.includes("group")
            ? [
                "Sie sind offen für Gruppen- oder Gemeinschaftsangebote.",
                "You are open to group or community offers.",
              ]
            : null,
  },
  {
    id: "counselling",
    label: ["Soziale und finanzielle Beratung", "Social and financial advice"],
    trigger: (s) =>
      s.profile.workStrain === "yes"
        ? [
            "Arbeit, Geld oder Wohnsituation belasten Sie derzeit stark.",
            "Work, money or housing are a major burden for you at the moment.",
          ]
        : null,
  },
  {
    id: "digital",
    label: ["Digitale Unterstützung (inkl. DiGA)", "Digital support (including DiGA)"],
    trigger: (s) =>
      s.profile.constraints.includes("noDigital")
        ? null
        : s.profile.preferences.includes("digital")
          ? [
              "Sie sind offen für digitale Programme.",
              "You are open to digital programmes.",
            ]
          : s.profile.constraints.includes("travel") || s.profile.constraints.includes("time")
            ? [
                "Wege oder Zeit sind für Sie schwierig – Angebote von zu Hause aus können passen.",
                "Travel or time are difficult for you — offers you can use from home may fit.",
              ]
            : null,
  },
  {
    id: "carer",
    label: ["Unterstützung bei Pflege- und Sorgeaufgaben", "Support with caring responsibilities"],
    trigger: (s) =>
      s.profile.caregiving === "yes"
        ? [
            "Sie pflegen oder betreuen regelmäßig eine andere Person.",
            "You regularly care for or look after another person.",
          ]
        : null,
  },
  {
    id: "participation",
    label: ["Teilhabe im Wohnumfeld", "Participation in your neighbourhood"],
    trigger: (s) =>
      s.profile.ageBand === "65+"
        ? [
            "Angebote speziell für ältere Menschen sind in vielen Gemeinden vorhanden.",
            "Offers specifically for older people exist in many municipalities.",
          ]
        : s.profile.livingAlone === "yes"
          ? [
              "Niedrigschwellige Treffpunkte in der Nähe können den Alltag strukturieren.",
              "Low-threshold meeting points nearby can give structure to the day.",
            ]
          : null,
  },
];

export type SocialOffer = {
  id: string;
  category: CategoryId;
  title: L;
  body: L;
  /** Where this kind of offer is typically found in Germany. */
  route: L;
  /** Search term used together with the entered location. */
  searchTerm: L;
};

export const SOCIAL_OFFERS: SocialOffer[] = [
  {
    id: "bewegungsgruppe",
    category: "movement",
    title: ["Bewegungsgruppe oder Reha-Sport", "Movement group or rehabilitation sport"],
    body: [
      "Wöchentliche Gruppen in Sportvereinen, oft von den gesetzlichen Kassen als Präventionskurs bezuschusst (§ 20 SGB V).",
      "Weekly groups at local sports clubs, usually subsidised by statutory health insurers as prevention courses (§ 20 SGB V).",
    ],
    route: [
      "Kursangebote Ihrer Krankenkasse, Sportvereine am Wohnort",
      "Course catalogue of your health insurer, local sports clubs",
    ],
    searchTerm: ["Bewegungsgruppe Präventionskurs", "movement group prevention course"],
  },
  {
    id: "wassergymnastik",
    category: "movement",
    title: ["Wassergymnastik / sanfte Bewegung", "Water gymnastics / gentle movement"],
    body: [
      "Gelenkschonende Gruppenangebote, geeignet bei Schmerzen, Übergewicht oder eingeschränkter Beweglichkeit.",
      "Joint-friendly group offers, suitable with pain, higher weight or limited mobility.",
    ],
    route: [
      "Schwimmbäder, Volkshochschule, Krankenkasse",
      "Public pools, adult education centres, insurer",
    ],
    searchTerm: ["Wassergymnastik Kurs", "water gymnastics course"],
  },
  {
    id: "selbsthilfegruppe",
    category: "peer",
    title: ["Selbsthilfegruppe Depression", "Depression peer support group"],
    body: [
      "Austausch mit Menschen in ähnlicher Situation, kostenlos und ohne Anmeldung bei der Praxis.",
      "Exchange with people in a similar situation, free of charge and without a referral.",
    ],
    route: [
      "NAKOS-Datenbank, Selbsthilfekontaktstelle im Landkreis",
      "NAKOS database, regional self-help contact point",
    ],
    searchTerm: ["Selbsthilfegruppe Depression", "depression self-help group"],
  },
  {
    id: "gespraechskreis",
    category: "peer",
    title: ["Offener Gesprächskreis / Begegnungscafé", "Open talking circle / drop-in café"],
    body: [
      "Regelmäßige, unverbindliche Treffen ohne therapeutischen Anspruch – ein erster Schritt aus dem Rückzug.",
      "Regular, informal meet-ups without therapeutic claims — a first step out of withdrawal.",
    ],
    route: [
      "Stadtteilzentren, Kirchengemeinden, Mehrgenerationenhäuser",
      "Neighbourhood centres, parishes, community centres",
    ],
    searchTerm: ["Gesprächskreis Begegnungscafé", "drop-in social café"],
  },
  {
    id: "sozialberatung",
    category: "counselling",
    title: ["Soziale Beratung (Schulden, Wohnen, Arbeit)", "Social advice (debt, housing, work)"],
    body: [
      "Kostenlose Beratungsstellen der Wohlfahrtsverbände helfen bei Belastungen, die die Stimmung aufrechterhalten.",
      "Free advice centres run by welfare organisations help with burdens that keep low mood going.",
    ],
    route: [
      "Caritas, Diakonie, AWO, Sozialamt der Gemeinde",
      "Caritas, Diakonie, AWO, municipal social services",
    ],
    searchTerm: ["Sozialberatung Beratungsstelle", "social advice centre"],
  },
  {
    id: "schuldnerberatung",
    category: "counselling",
    title: ["Schuldner- und Sozialrechtsberatung", "Debt and welfare rights advice"],
    body: [
      "Anerkannte Stellen beraten kostenfrei zu Schulden, Anträgen und Ansprüchen.",
      "Recognised services advise free of charge on debt, applications and entitlements.",
    ],
    route: ["Kommunale Schuldnerberatung, Verbraucherzentrale", "Municipal debt advice, consumer advice centre"],
    searchTerm: ["Schuldnerberatung", "debt advice"],
  },
  {
    id: "diga",
    category: "digital",
    title: ["Digitale Gesundheitsanwendung (DiGA)", "Prescribable digital health app (DiGA)"],
    body: [
      "Von der Praxis verordnungsfähige Programme gegen Depression, von der gesetzlichen Kasse bezahlt.",
      "Programmes for depression that your practice can prescribe, covered by statutory insurance.",
    ],
    route: [
      "DiGA-Verzeichnis des BfArM, Verordnung in der Praxis",
      "BfArM DiGA directory, prescription at the practice",
    ],
    searchTerm: ["DiGA Depression Verzeichnis", "DiGA depression directory"],
  },
  {
    id: "onlinekurs",
    category: "digital",
    title: ["Online-Kurs zu Stress und Stimmung", "Online course on stress and mood"],
    body: [
      "Begleitete Online-Kurse der Krankenkassen und Volkshochschulen, von zu Hause aus nutzbar.",
      "Guided online courses from insurers and adult education centres, usable from home.",
    ],
    route: ["Krankenkasse, Volkshochschule online", "Health insurer, online adult education"],
    searchTerm: ["Online Kurs Stressbewältigung", "online stress management course"],
  },
  {
    id: "pflegeentlastung",
    category: "carer",
    title: ["Entlastung für pflegende Angehörige", "Respite for family carers"],
    body: [
      "Beratung, Pflegekurse, Tagespflege und stundenweise Betreuung entlasten den Alltag messbar.",
      "Advice, carer courses, day care and hourly support measurably relieve everyday life.",
    ],
    route: ["Pflegestützpunkt, Pflegekasse, Angehörigenverbände", "Care support point, care insurer, carer associations"],
    searchTerm: ["Pflegestützpunkt Angehörige Entlastung", "carer support respite"],
  },
  {
    id: "angehoerigengruppe",
    category: "carer",
    title: ["Gruppe für Angehörige", "Group for family and carers"],
    body: [
      "Regelmäßige Treffen für Menschen mit Sorge- und Pflegeverantwortung, oft mit Betreuungsangebot.",
      "Regular meetings for people with caring responsibilities, often with a care service on site.",
    ],
    route: ["Sozialpsychiatrischer Dienst, Angehörigenverbände", "Community mental health service, carer associations"],
    searchTerm: ["Angehörigengruppe", "carers group"],
  },
  {
    id: "seniorentreff",
    category: "participation",
    title: ["Senioren- und Begegnungstreffs", "Senior and social meeting points"],
    body: [
      "Regelmäßige Treffen, gemeinsame Mahlzeiten und Ausflüge, häufig mit Fahrdienst.",
      "Regular meet-ups, shared meals and outings, often with a transport service.",
    ],
    route: ["Gemeinde, Seniorenbüro, Kirchengemeinden", "Municipality, senior citizens' office, parishes"],
    searchTerm: ["Seniorentreff Begegnungsstätte", "senior meeting point"],
  },
  {
    id: "ehrenamt",
    category: "participation",
    title: ["Ehrenamt, Gemeinschaftsgarten, Repair-Café", "Volunteering, community garden, repair café"],
    body: [
      "Tätigkeiten mit fester Zeitstruktur und Kontakt, niedrigschwellig und kostenfrei.",
      "Activities with a fixed weekly structure and contact, low-threshold and free of charge.",
    ],
    route: ["Freiwilligenagentur, Stadtteilzentrum", "Volunteering agency, neighbourhood hub"],
    searchTerm: ["Freiwilligenagentur Gemeinschaftsgarten", "volunteering community garden"],
  },
];

export type MatchedCategory = {
  category: OfferCategory;
  reason: L;
  offers: SocialOffer[];
};

/** Step 1: select categories from questionnaire answers (prototype rules). */
export const matchCategories = (s: Session, baseline: number): MatchedCategory[] =>
  OFFER_CATEGORIES.flatMap((category) => {
    const reason = category.trigger(s, baseline);
    if (!reason) return [];
    return [
      {
        category,
        reason,
        offers: SOCIAL_OFFERS.filter((o) => o.category === category.id),
      },
    ];
  });

export const PERSONALISATION_NOTE: L = [
  "Prototyp-Logik: Die Auswahl folgt festen Regeln aus Ihren Fragebogenantworten. Der Ort wird erst danach genutzt, um in den ausgewählten Kategorien nach Angeboten in Ihrer Nähe zu suchen.",
  "Prototype logic: the selection follows fixed rules based on your questionnaire answers. Your location is only used afterwards to look for offers near you within the selected categories.",
];

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
