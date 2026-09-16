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
  /** First-degree relative (parent/sibling) with depression — heritability roughly doubles-to-quintuples offspring risk. */
  familyHistoryDepression: YesNo | null;
  priorTreatment: string[];
  /**
   * Only asked if the patient already knows it. Feeds the Step-1 risk-score
   * model (src/lib/riskScore.ts) when known, or via the in-app
   * mini-questionnaire below when not; otherwise a documented
   * population-typical default is used (see DEFAULT_GAD7_TOTAL there).
   */
  gad7Known: YesNo | null;
  gad7Score: number | null;
  /** Whether the patient opted to fill in the GAD-7 mini-questionnaire after saying they don't know their score. */
  gad7FillNow: boolean;
  /** Answers to the in-app GAD-7 mini-questionnaire (7 items, 0-3 each) — see effectiveGad7Score in lib/gad7.ts. */
  gad7Answers: (number | null)[];
};

export type SafetyAnswers = {
  /** Any concrete plan or preparation for self-harm. */
  plan: YesNo | null;
  /** Feels able to stay safe until support is available. */
  canStaySafe: YesNo | null;
  /** Self-harm within the past 12 months. */
  pastAttempt: YesNo | null;
};

export type Session = {
  phq: (number | null)[];
  safety: SafetyAnswers;
  profile: Profile;
  completedAt: string | null;
};

export const emptySession = (): Session => ({
  phq: Array<number | null>(9).fill(null),
  safety: { plan: null, canStaySafe: null, pastAttempt: null },
  profile: {
    birthDate: null,
    sex: null,
    priorEpisode: null,
    familyHistoryDepression: null,
    priorTreatment: [],
    gad7Known: null,
    gad7Score: null,
    gad7FillNow: false,
    gad7Answers: Array<number | null>(7).fill(null),
  },
  completedAt: null,
});

export const PRIOR_TREATMENTS = questionnaireContent.profile.priorTreatment.options;
export const SEX_OPTIONS = questionnaireContent.profile.sex.options as {
  value: Sex;
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
