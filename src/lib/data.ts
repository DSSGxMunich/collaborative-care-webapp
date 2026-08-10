import { supabase } from "@/integrations/supabase/client";
import { emptySession, type Session } from "./session";
import { phq9Total } from "./phq9";
import { assessRisk } from "./safety";

export type AssessmentRow = {
  id: string;
  patient_id: string;
  created_at: string;
  phq_total: number;
  risk: string;
  answers: Session;
};

export const asSession = (answers: unknown): Session => ({
  ...emptySession(),
  ...((answers ?? {}) as Session),
});

export async function saveAssessment(session: Session) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("not signed in");

  const payload: Session = { ...session, completedAt: new Date().toISOString() };
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      patient_id: userId,
      answers: payload as unknown as never,
      phq_total: phq9Total(payload.phq),
      risk: assessRisk(payload),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listMyAssessments(): Promise<AssessmentRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("assessments")
    .select("id, patient_id, created_at, phq_total, risk, answers")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AssessmentRow[];
}

export async function joinPractice(code: string) {
  const { data, error } = await supabase.rpc("join_practice", { _code: code });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { practice_id: string; practice_name: string } | null;
}

export async function updateMyName(fullName: string) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("not signed in");
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);
  if (error) throw error;
}

export type PatientSummary = {
  id: string;
  fullName: string;
  assessmentCount: number;
  latest: AssessmentRow | null;
};

/** All patients of the signed-in GP's practice, with their latest assessment. */
export async function listPracticePatients(practiceId: string): Promise<PatientSummary[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("practice_id", practiceId);
  if (error) throw error;

  const ids = (profiles ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: assessments, error: aErr } = await supabase
    .from("assessments")
    .select("id, patient_id, created_at, phq_total, risk, answers")
    .in("patient_id", ids)
    .order("created_at", { ascending: false });
  if (aErr) throw aErr;

  const rows = (assessments ?? []) as unknown as AssessmentRow[];
  return (profiles ?? [])
    .map((p) => {
      const mine = rows.filter((r) => r.patient_id === p.id);
      return {
        id: p.id,
        fullName: p.full_name || "—",
        assessmentCount: mine.length,
        latest: mine[0] ?? null,
      };
    })
    .sort((a, b) => (b.latest?.created_at ?? "").localeCompare(a.latest?.created_at ?? ""));
}

export async function getPatientDetail(patientId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", patientId)
    .maybeSingle();
  if (error) throw error;

  const { data, error: aErr } = await supabase
    .from("assessments")
    .select("id, patient_id, created_at, phq_total, risk, answers")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (aErr) throw aErr;

  return {
    profile: profile ? { id: profile.id, fullName: profile.full_name || "—" } : null,
    assessments: (data ?? []) as unknown as AssessmentRow[],
  };
}
