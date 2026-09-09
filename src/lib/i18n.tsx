import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "de" | "en";

/** Bilingual string: [German, English]. */
export type L = readonly [string, string];

export const t = (v: L, lang: Lang) => (lang === "de" ? v[0] : v[1]);

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (v: L) => string;
};

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "sdc-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, setLang, tr: (v: L) => t(v, lang) }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

export const ui = {
  appName: ["Depressions-Kompass", "Depression Compass"] as L,
  appTagline: [
    "Entscheidungshilfe für strukturierte Depressionsversorgung",
    "Decision aid for structured depression care",
  ] as L,
  start: ["Fragebogen starten", "Start questionnaire"] as L,
  continue: ["Weiter", "Continue"] as L,
  back: ["Zurück", "Back"] as L,
  finish: ["Auswertung anzeigen", "Show my results"] as L,
  home: ["Start", "Home"] as L,
  results: ["Ergebnis", "Results"] as L,
  clinician: ["Für die Praxis", "For the practice"] as L,
  support: ["Angebote vor Ort", "Local support"] as L,
  crisis: ["Soforthilfe", "Urgent help"] as L,
  step: ["Schritt", "Step"] as L,
  of: ["von", "of"] as L,
  noData: [
    "Es liegen noch keine Antworten vor. Bitte füllen Sie zuerst den Fragebogen aus.",
    "No answers yet. Please complete the questionnaire first.",
  ] as L,
  disclaimer: [
    "Dieses Werkzeug ersetzt keine ärztliche Diagnose oder Behandlung. Die Vorhersagen beruhen auf gemittelten Studienergebnissen und sind Schätzungen für Gruppen von Menschen mit ähnlichem Profil.",
    "This tool does not replace medical diagnosis or treatment. Predictions are based on averaged study results and are estimates for groups of people with a similar profile.",
  ] as L,
};
