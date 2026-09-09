import { useMemo } from "react";
import { gad7Total } from "./gad7";
import { phq9Total, severityFor } from "./phq9";
import { assessRisk } from "./safety";
import { buildPredictions, componentById, type CareComponent, type ComponentId } from "./model";
import { useSession } from "./session";
import { matchCategories } from "./social";
import { predictTrajectory } from "./trajectoryModel";

export function usePrediction() {
  const { session, hydrated } = useSession();

  return useMemo(() => {
    const baseline = phq9Total(session.phq);
    const complete = session.completedAt !== null && session.phq.every((v) => v !== null);
    const input = { baseline, functioning: session.functioning, profile: session.profile };
    const predictions = buildPredictions(input);

    // Step 2: independent 12-month trajectory model — see trajectoryModel.ts.
    // ageBand/sex are guaranteed non-null by the questionnaire's "basics" step
    // once the session is complete; GAD-7 is optional (skippable). A directly
    // entered gad7KnownScore (already range/format-validated by
    // parseGad7Score before being stored, see session.tsx) takes priority
    // over the 7 item answers and over having skipped.
    const gad7Complete = session.gad7.every((v) => v !== null);
    const gad7Value =
      session.gad7KnownScore !== null
        ? session.gad7KnownScore
        : session.gad7Skipped || !gad7Complete
          ? null
          : gad7Total(session.gad7);
    const trajectory =
      complete && session.profile.ageBand !== null && session.profile.sex !== null
        ? predictTrajectory({
            ageBand: session.profile.ageBand,
            sex: session.profile.sex,
            baselinePhq9: baseline,
            gad7Total: gad7Value,
          })
        : null;

    return {
      hydrated,
      complete,
      baseline,
      severity: severityFor(baseline),
      risk: assessRisk(session),
      session,
      categories: matchCategories(session, baseline),
      trajectory,
      ...predictions,
    };
  }, [session, hydrated]);
}

export const componentLabel = (id: ComponentId): CareComponent => componentById(id);
