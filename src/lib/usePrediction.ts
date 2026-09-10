import { useMemo } from "react";
import { phq9Total, severityFor } from "./phq9";
import { assessRisk, crisisLevel } from "./safety";
import { buildPredictions } from "./model";
import { useSession } from "./session";

export function usePrediction() {
  const { session, hydrated } = useSession();

  return useMemo(() => {
    const baseline = phq9Total(session.phq);
    const complete = session.completedAt !== null && session.phq.every((v) => v !== null);
    const input = { baseline, profile: session.profile };
    const predictions = buildPredictions(input);
    return {
      hydrated,
      complete,
      baseline,
      severity: severityFor(baseline),
      risk: assessRisk(session),
      crisis: crisisLevel(session, baseline),
      session,
      ...predictions,
    };
  }, [session, hydrated]);
}
