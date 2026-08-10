import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { listPracticePatients } from "@/lib/data";
import { RISK_FLAG } from "@/components/ClinicalReport";

export const Route = createFileRoute("/_authenticated/praxis")({
  head: () => ({
    meta: [
      { title: "Praxis-Dashboard – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Übersicht aller Patientinnen und Patienten der Praxis mit PHQ-9-Werten, Risikoflags und Empfehlungen.",
      },
      { property: "og:title", content: "Praxis-Dashboard – Depressions-Kompass" },
      {
        property: "og:description",
        content: "Patientenliste, PHQ-9-Verlauf und modellbasierte Empfehlungen für die Praxis.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { tr } = useLang();
  const { account } = useAuth();
  const practiceId = account?.practice?.id ?? null;

  const patients = useQuery({
    queryKey: ["practicePatients", practiceId],
    queryFn: () => listPracticePatients(practiceId!),
    enabled: !!practiceId,
  });

  if (account?.role !== "gp") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted-foreground">
          {tr([
            "Dieser Bereich ist für Praxen. Ihr Zugang ist ein Patientenzugang.",
            "This area is for practices. Your account is a patient account.",
          ])}
        </p>
        <Link to="/fragebogen" className="mt-4 inline-flex text-sm font-semibold text-primary">
          {tr(["Zum Fragebogen", "Go to the questionnaire"])}
        </Link>
      </div>
    );
  }

  const rows = patients.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">
        {tr(["Praxis-Dashboard", "Practice dashboard"])}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{account.practice?.name}</p>

      <div className="surface-card mt-6 p-5">
        <p className="text-sm font-semibold">{tr(["Praxis-Code", "Practice code"])}</p>
        <p className="mt-1 font-display text-2xl font-semibold tracking-widest">
          {account.practice?.code ?? "—"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {tr([
            "Geben Sie diesen Code an Ihre Patientinnen und Patienten weiter, damit ihre Ergebnisse hier erscheinen.",
            "Share this code with your patients so their results appear here.",
          ])}
        </p>
      </div>

      <div className="surface-card mt-6 overflow-x-auto p-1">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">{tr(["Patient:in", "Patient"])}</th>
              <th className="px-4 py-3 font-semibold">PHQ-9</th>
              <th className="px-4 py-3 font-semibold">{tr(["Risiko", "Risk"])}</th>
              <th className="px-4 py-3 font-semibold">{tr(["Letzte Erhebung", "Last entry"])}</th>
              <th className="px-4 py-3 font-semibold">{tr(["Anzahl", "Count"])}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">
                  <Link
                    to="/patient/$patientId"
                    params={{ patientId: r.id }}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {r.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.latest ? `${r.latest.phq_total}/27` : "—"}</td>
                <td className="px-4 py-3">
                  {r.latest ? tr(RISK_FLAG[r.latest.risk] ?? RISK_FLAG["none"]!) : "—"}
                </td>
                <td className="px-4 py-3">
                  {r.latest ? new Date(r.latest.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">{r.assessmentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {patients.isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">{tr(["Lädt …", "Loading …"])}</p>
      )}
      {!patients.isLoading && rows.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {tr([
            "Noch keine Patientinnen und Patienten verknüpft.",
            "No patients linked yet.",
          ])}
        </p>
      )}
    </div>
  );
}
