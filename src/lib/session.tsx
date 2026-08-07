import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { L } from "./i18n";

export type AgeBand = "18-29" | "30-49" | "50-64" | "65+";
export type Duration = "lt3m" | "3to12m" | "gt12m";
export type YesNo = "yes" | "no";

export type Profile = {
  ageBand: AgeBand | null;
  duration: Duration | null;
  priorEpisodes: YesNo | null;
  priorTreatment: string[];
  chronicIllness: YesNo | null;
  livingAlone: YesNo | null;
  lowSupport: YesNo | null;
  workStrain: YesNo | null;
  substanceUse: YesNo | null;
  preferences: string[];
  mobilityLimited: YesNo | null;
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
  functioning: number | null;
  safety: SafetyAnswers;
  profile: Profile;
  completedAt: string | null;
};

export const emptySession = (): Session => ({
  phq: Array<number | null>(9).fill(null),
  functioning: null,
  safety: { plan: null, canStaySafe: null, pastAttempt: null },
  profile: {
    ageBand: null,
    duration: null,
    priorEpisodes: null,
    priorTreatment: [],
    chronicIllness: null,
    livingAlone: null,
    lowSupport: null,
    workStrain: null,
    substanceUse: null,
    preferences: [],
    mobilityLimited: null,
  },
  completedAt: null,
});

export const PRIOR_TREATMENTS: { id: string; label: L }[] = [
  { id: "antidepressant", label: ["Antidepressiva", "Antidepressant medication"] },
  { id: "psychotherapy", label: ["Psychotherapie", "Psychotherapy"] },
  { id: "inpatient", label: ["Klinikaufenthalt", "Inpatient treatment"] },
  { id: "selfhelp", label: ["Selbsthilfe / Online-Programm", "Self-help or online programme"] },
  { id: "none", label: ["Noch keine Behandlung", "No treatment so far"] },
];

export const PREFERENCES: { id: string; label: L }[] = [
  { id: "talking", label: ["Gespräche / Psychotherapie", "Talking therapy"] },
  { id: "medication", label: ["Medikamente", "Medication"] },
  { id: "activity", label: ["Bewegung & Aktivität", "Movement & activity"] },
  { id: "digital", label: ["Digitale Programme", "Digital programmes"] },
  { id: "group", label: ["Gruppen- oder Gemeinschaftsangebote", "Group or community offers"] },
  { id: "gpLed", label: ["Engere Begleitung durch die Praxis", "Closer follow-up by the practice"] },
];

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
const KEY = "sdc-session-v1";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(emptySession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(KEY);
      if (raw) setSession({ ...emptySession(), ...(JSON.parse(raw) as Session) });
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
    (patch: Partial<SafetyAnswers>) => setSession((s) => ({ ...s, safety: { ...s.safety, ...patch } })),
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
