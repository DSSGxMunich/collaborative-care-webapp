import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import questionnaireContent from "@/content/questionnaire.json";

export type YesNo = "yes" | "no";
/**
 * "female" and "male" feed the Step-1 risk-score model (src/lib/riskScore.ts,
 * the sex=Male dummy). The other options are offered so nobody is forced
 * into a binary answer, but there isn't enough trial data to fit a
 * coefficient for them — the risk score falls back to the Female (reference
 * level) estimate for those, same as leaving sex unanswered.
 */
export type Sex = "female" | "male" | "other" | "intersex" | "unsure" | "preferNotToSay";

export type Profile = {
  /** Date of birth, ISO "YYYY-MM-DD". Age is derived from this — see ageFromBirthDate. */
  birthDate: string | null;
  /** Used by the Step-1 risk-score model (src/lib/riskScore.ts) when female/male. */
  sex: Sex | null;
  priorEpisode: YesNo | null;
  priorTreatment: string[];
};

/**
 * The "4 P's" of the P4 Screener (Dube, Kroenke, Bair, Theobald & Williams,
 * 2010, Prim Care Companion J Clin Psychiatry) — a brief suicide-risk
 * screener validated in 2 RCTs of primary-care/oncology patients. A German
 * translation has separately been validated (Schluessel et al. 2023, J Clin
 * Med, LMU Munich) against the SBQ-R in German primary-care/psychiatric
 * outpatients — this app's German wording is this session's own translation
 * of the original English items, not copied from that paper's published
 * German wording (which could not be retrieved directly — see PR notes), so
 * it should be checked against Schluessel et al.'s instrument before this
 * can be called "the validated German P4" rather than "P4-based".
 */
export type SafetyAnswers = {
  /** P4 "Past": ever harmed self / attempted suicide (lifetime, not time-boxed). */
  past: YesNo | null;
  /** P4 "Plan": has thought about how they might actually hurt themselves. */
  plan: YesNo | null;
  /** P4 "Probability": self-rated likelihood of acting on these thoughts within the next month. 0=not at all likely, 1=somewhat likely, 2=very likely. */
  probability: 0 | 1 | 2 | null;
  /** P4 "Preventive factors": whether anything would stop them (protective factors). */
  preventive: YesNo | null;
  /**
   * Suicide or suicide attempt in a first-degree relative (parent/sibling).
   * Not part of P4 — added per GP feedback. Family history of suicidal
   * behavior is an evidenced risk factor independent of psychiatric
   * diagnosis — collected here alongside the other safety questions, but
   * not currently fed into assessRisk's acute-risk logic (see the caveat
   * in lib/safety.ts).
   */
  familyHistory: YesNo | null;
};

export type Session = {
  phq: (number | null)[];
  safety: SafetyAnswers;
  profile: Profile;
  completedAt: string | null;
};

export const emptySession = (): Session => ({
  phq: Array<number | null>(9).fill(null),
  safety: { past: null, plan: null, probability: null, preventive: null, familyHistory: null },
  profile: {
    birthDate: null,
    sex: null,
    priorEpisode: null,
    priorTreatment: [],
  },
  completedAt: null,
});

export const PRIOR_TREATMENTS = questionnaireContent.profile.priorTreatment.options;
export const SEX_OPTIONS = questionnaireContent.profile.sex.options as {
  value: Sex;
  label: { de: string; en: string };
}[];
export const PROBABILITY_OPTIONS = questionnaireContent.safety.probabilityOptions as {
  value: 0 | 1 | 2;
  label: { de: string; en: string };
}[];

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

/**
 * Age in years as a float (e.g. 22.87), derived from a birth date so the
 * outcome model gets a precise value rather than a rounded whole number.
 */
export function ageFromBirthDate(birthDateIso: string, at: Date = new Date()): number {
  const birth = new Date(`${birthDateIso}T00:00:00`);
  return (at.getTime() - birth.getTime()) / MS_PER_YEAR;
}

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Reasonable bounds for a birth-date picker: today, and 110 years ago. */
export function birthDateBounds(now: Date = new Date()) {
  const min = new Date(now);
  min.setFullYear(min.getFullYear() - 110);
  return { min: toIsoDate(min), max: toIsoDate(now) };
}

type Ctx = {
  session: Session;
  update: (patch: Partial<Session>) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSafety: (patch: Partial<SafetyAnswers>) => void;
  setPhq: (index: number, value: number) => void;
  reset: () => void;
  hydrated: boolean;
};

const SessionContext = createContext<Ctx | null>(null);
const KEY = "sdc-session-v2";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(emptySession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Session;
        setSession({
          ...emptySession(),
          ...parsed,
          profile: { ...emptySession().profile, ...parsed.profile },
          safety: { ...emptySession().safety, ...parsed.safety },
        });
      }
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  }, [session, hydrated]);

  const update = useCallback(
    (patch: Partial<Session>) => setSession((s) => ({ ...s, ...patch })),
    [],
  );
  const updateProfile = useCallback(
    (patch: Partial<Profile>) => setSession((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    [],
  );
  const updateSafety = useCallback(
    (patch: Partial<SafetyAnswers>) =>
      setSession((s) => ({ ...s, safety: { ...s.safety, ...patch } })),
    [],
  );
  const setPhq = useCallback(
    (index: number, value: number) =>
      setSession((s) => {
        const phq = [...s.phq];
        phq[index] = value;
        return { ...s, phq };
      }),
    [],
  );
  const reset = useCallback(() => {
    setSession(emptySession());
    window.sessionStorage.removeItem(KEY);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ session, update, updateProfile, updateSafety, setPhq, reset, hydrated }),
    [session, update, updateProfile, updateSafety, setPhq, reset, hydrated],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
