import { useMemo } from "react";
import { phq9Total, severityFor } from "./phq9";
import { assessRisk } from "./safety";
import { buildPredictions, componentById, type CareComponent, type ComponentId } from "./model";
import { useSession } from "./session";
import { matchCategories } from "./social";

export function usePrediction() {
  const { session, hydrated } = useSession();

  return useMemo(() => {
    const baseline = phq9Total(session.phq);
    const complete = session.completedAt !== null && session.phq.every((v) => v !== null);
    const input = { baseline, functioning: session.functioning, profile: session.profile };
    const predictions = buildPredictions(input);
    return {
      hydrated,
      complete,
      baseline,
      severity: severityFor(baseline),
      risk: assessRisk(session),
      session,
      categories: matchCategories(session, baseline),
      ...predictions,
    };
  }, [session, hydrated]);
}

export const componentLabel = (id: ComponentId): CareComponent => componentById(id);
