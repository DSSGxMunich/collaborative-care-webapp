import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ResultsView } from "@/components/ResultsView";
import { useLang, ui } from "@/lib/i18n";
import { usePrediction } from "@/lib/usePrediction";
import { asSession, listMyAssessments } from "@/lib/data";
import { computePrediction } from "@/lib/predict";

export const Route = createFileRoute("/_authenticated/ergebnis")({
  head: () => ({
    meta: [
      { title: "Ihre Auswertung – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Patientenindividuelle Schätzung des Symptomverlaufs unter üblicher Versorgung sowie unter einzelnen und kombinierten Bausteinen strukturierter Depressionsversorgung.",
      },
      { property: "og:title", content: "Ihre Auswertung – Depressions-Kompass" },
      {
        property: "og:description",
        content:
          "PHQ-9-Ergebnis, Risikohinweise und geschätzte Behandlungsergebnisse für Ihr Profil.",
      },
    ],
  }),
  component: Results,
});

function Results() {
  const { tr } = useLang();
  const draft = usePrediction();
  const history = useQuery({ queryKey: ["myAssessments"], queryFn: listMyAssessments });

  const rows = history.data ?? [];
  const latest = rows[0];
  const p = draft.complete ? draft : latest ? computePrediction(asSession(latest.answers)) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">
        {tr(["Ihre Auswertung", "Your results"])}
      </h1>

      {!p ? (
        <div className="surface-card mt-6 p-6">
          <p className="text-sm text-muted-foreground">{tr(ui.noData)}</p>
          <Link
            to="/fragebogen"
            className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {tr(ui.start)}
          </Link>
        </div>
      ) : (
        <>
          <ResultsView p={p} />
          {rows.length > 1 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-semibold">
                {tr(["Verlauf", "Your history"])}
              </h2>
              <ul className="surface-card mt-4 divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    <span className="font-semibold">PHQ-9 {r.phq_total}/27</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="mt-8">
            <Link
              to="/angebote"
              className="inline-flex rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold"
            >
              {tr(ui.support)}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
