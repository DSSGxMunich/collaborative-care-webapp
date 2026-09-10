import { useMemo } from "react";
import { gad7Total } from "./gad7";
import { phq9Total, severityFor } from "./phq9";
import { assessRisk } from "./safety";
import { buildPredictions, componentById, type CareComponent, type ComponentId } from "./model";
import { predictRiskModel } from "./riskModel";
import { useSession } from "./session";
import { matchCategories } from "./social";

export function usePrediction() {
  const { session, hydrated } = useSession();

  return useMemo(() => {
    const baseline = phq9Total(session.phq);
    const complete = session.completedAt !== null && session.phq.every((v) => v !== null);
    const input = { baseline, functioning: session.functioning, profile: session.profile };
    const predictions = buildPredictions(input);

    // Step 2: independent 12-month risk-score model — see riskModel.ts. It
    // takes the same baseline inputs as step 1 (age band, sex, baseline
    // PHQ-9), extended with one new one (GAD-7 total); age band/sex are only
    // guaranteed once the questionnaire's "basics" step is complete. GAD-7 is
    // optional — a skipped or incomplete GAD-7 falls back to an imputed value
    // inside riskModel.ts (flagged via riskModel.gad7Imputed).
    const gad7Complete = session.gad7.every((v) => v !== null);
    const gad7Value = session.gad7Skipped || !gad7Complete ? null : gad7Total(session.gad7);
    const riskModel =
      complete && session.profile.ageBand !== null && session.profile.sex !== null
        ? predictRiskModel({
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
      riskModel,
      ...predictions,
    };
  }, [session, hydrated]);
}

export const componentLabel = (id: ComponentId): CareComponent => componentById(id);
