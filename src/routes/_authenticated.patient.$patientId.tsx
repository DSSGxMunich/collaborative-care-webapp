import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClinicalReport } from "@/components/ClinicalReport";
import { ResultsView } from "@/components/ResultsView";
import { useLang } from "@/lib/i18n";
import { asSession, getPatientDetail } from "@/lib/data";
import { computePrediction } from "@/lib/predict";

export const Route = createFileRoute("/_authenticated/patient/$patientId")({
  head: () => ({
    meta: [
      { title: "Patientenprofil – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Kurzbefund, PHQ-9-Itemprofil, Risikoflags und modellbasierte Empfehlungen für eine einzelne Patientin oder einen einzelnen Patienten.",
      },
      { property: "og:title", content: "Patientenprofil – Depressions-Kompass" },
      {
        property: "og:description",
        content: "Aggregierte Auswertung eines Patientenprofils für die hausärztliche Praxis.",
      },
    ],
  }),
  component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = Route.useParams();
  const { tr } = useLang();
  const [selected, setSelected] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["patientDetail", patientId],
    queryFn: () => getPatientDetail(patientId),
  });

  const assessments = detail.data?.assessments ?? [];
  const current = assessments.find((a) => a.id === selected) ?? assessments[0];
  const p = current ? computePrediction(asSession(current.answers)) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/praxis" className="text-sm font-semibold text-primary">
        ← {tr(["Zur Patientenliste", "Back to patient list"])}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">
        {detail.data?.profile?.fullName ?? "—"}
      </h1>

      {assessments.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {assessments.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                a.id === current?.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground",
              ].join(" ")}
            >
              {new Date(a.created_at).toLocaleDateString()} · {a.phq_total}
            </button>
          ))}
        </div>
      )}

      {!p ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {detail.isLoading
            ? tr(["Lädt …", "Loading …"])
            : tr([
                "Diese Person hat noch keinen Fragebogen abgeschlossen.",
                "This person has not completed a questionnaire yet.",
              ])}
        </p>
      ) : (
        <div className="mt-6">
          <ClinicalReport p={p} />
          <div className="mt-10">
            <h2 className="font-display text-2xl font-semibold">
              {tr(["Empfehlungen & Kombinationen", "Recommendations & combinations"])}
            </h2>
            <ResultsView p={p} audience="clinician" />
          </div>
        </div>
      )}
    </div>
  );
}
