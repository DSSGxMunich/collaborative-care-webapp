import { useMemo } from "react";
import { CARE_COMPONENTS, type CareComponent, type ComponentId } from "./model";
import { computePrediction } from "./predict";
import { useSession } from "./session";

/** Prediction for the questionnaire draft currently held in this browser. */
export function usePrediction() {
  const { session, hydrated } = useSession();

  return useMemo(() => {
    const p = computePrediction(session);
    return { hydrated, ...p, complete: p.complete && session.completedAt !== null };
  }, [session, hydrated]);
}

export const componentLabel = (id: ComponentId): CareComponent =>
  CARE_COMPONENTS.find((c) => c.id === id)!;
