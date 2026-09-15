import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import uiContent from "@/content/ui.json";

export type Lang = "de" | "en";

/** Bilingual string, as stored in every file under src/content/. */
export type L = { de: string; en: string };

export const t = (v: L, lang: Lang) => v[lang];

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

/** Common, cross-page UI strings — everything page-specific lives in its own content file. */
export const ui = uiContent as {
  appName: L;
  appTagline: L;
  nav: Record<
    | "home"
    | "questionnaire"
    | "results"
    | "clinician"
    | "support"
    | "faq"
    | "methodology"
    | "crisis",
    L
  >;
  buttons: Record<"start" | "continue" | "back" | "finish", L>;
  step: L;
  of: L;
  yes: L;
  no: L;
  noData: L;
  disclaimer: L;
  researchPrototype: L;
  noAnswersLeaveDevice: L;
  dateField: Record<"day" | "month" | "year", L>;
};

/** Fills `{placeholder}` tokens in a translated string, e.g. tr(x, { version: "1.0" }). */
export const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce<string>((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), s);
