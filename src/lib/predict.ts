import { phq9Total, severityFor } from "./phq9";
import { assessRisk } from "./safety";
import { buildPredictions } from "./model";
import { emptySession, type Session } from "./session";
import { matchOffers } from "./social";

export type Prediction = ReturnType<typeof computePrediction>;

/** Pure prediction for any session object (own draft or a stored assessment). */
export function computePrediction(session: Session) {
  const s = { ...emptySession(), ...session };
  const baseline = phq9Total(s.phq);
  const complete = s.phq.every((v) => v !== null);
  const predictions = buildPredictions({
    baseline,
    functioning: s.functioning,
    profile: s.profile,
  });
  return {
    complete,
    baseline,
    severity: severityFor(baseline),
    risk: assessRisk(s),
    session: s,
    offers: matchOffers(s, baseline),
    ...predictions,
  };
}
