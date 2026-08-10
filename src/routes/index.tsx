import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, ui, type L } from "@/lib/i18n";
import heroImage from "@/assets/hero-calm.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Depressions-Kompass – Vorhersage-Tool für die Hausarztpraxis" },
      {
        name: "description",
        content:
          "Zugang für Patientinnen, Patienten und Praxen: PHQ-9-Fragebogen mit Sicherheitsalgorithmus und evidenzinformierter Vorhersage passender Bausteine strukturierter Depressionsversorgung.",
      },
      {
        property: "og:title",
        content: "Depressions-Kompass – Vorhersage-Tool für die Hausarztpraxis",
      },
      {
        property: "og:description",
        content:
          "Patientenfragebogen, Risikoprüfung und patientenindividuelle Vorhersage – plus Praxis-Dashboard für Ihre Patientenprofile.",
      },
    ],
  }),
  component: Index,
});

const roles: { role: "patient" | "gp"; title: L; body: L; cta: L }[] = [
  {
    role: "patient",
    title: ["Ich bin Patientin oder Patient", "I am a patient"],
    body: [
      "Fragebogen ausfüllen, Auswertung ansehen und passende Angebote vor Ort finden. Mit dem Code Ihrer Praxis sieht Ihr Behandlungsteam die Ergebnisse.",
      "Complete the questionnaire, view your results and find suitable local offers. With your practice's code your care team can see the results.",
    ],
    cta: ["Als Patient:in anmelden", "Continue as patient"],
  },
  {
    role: "gp",
    title: ["Ich bin Ärztin oder Arzt", "I am a clinician"],
    body: [
      "Praxis-Dashboard mit allen verknüpften Patientenprofilen: PHQ-9-Verlauf, Risikoflags, Rangfolge der Versorgungsbausteine und Kombinationen.",
      "Practice dashboard with all linked patient profiles: PHQ-9 trajectory, risk flags, ranking of care components and combinations.",
    ],
    cta: ["Als Praxis anmelden", "Continue as practice"],
  },
];

function Index() {
  const { tr } = useLang();

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 pb-4 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
              {tr(["Forschungsprototyp", "Research prototype"])}
            </p>
            <h1 className="mt-5 text-balance-tight font-display text-4xl font-semibold leading-[1.08] sm:text-5xl">
              {tr([
                "Welche Depressionsbehandlung passt zu wem?",
                "Which depression care is likely to help whom?",
              ])}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {tr([
                "Der Depressions-Kompass verbindet Patientenantworten mit Ergebnissen einer Metaanalyse individueller Patientendaten und schätzt, wie sich Beschwerden unter verschiedenen Bausteinen strukturierter Depressionsversorgung entwickeln könnten.",
                "Depression Compass links patient answers to results from an individual-patient-data meta-analysis and estimates how symptoms might develop under different components of structured depression care.",
              ])}
            </p>
            <p className="mt-5 text-xs text-muted-foreground">
              {tr([
                "Zugang mit E-Mail und Passwort. Patientendaten sind nur für die verknüpfte Praxis sichtbar.",
                "Access with email and password. Patient data is only visible to the linked practice.",
              ])}
            </p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border shadow-lift">
            <img
              src={heroImage}
              alt={tr([
                "Ruhiges Wartezimmer einer Hausarztpraxis mit Tageslicht und Pflanzen",
                "Calm general-practice waiting room with daylight and plants",
              ])}
              className="h-full w-full object-cover"
              width={880}
              height={880}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["Wie möchten Sie fortfahren?", "How would you like to continue?"])}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {roles.map((r) => (
            <div key={r.role} className="surface-card flex flex-col p-6">
              <h3 className="font-display text-lg font-semibold">{tr(r.title)}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tr(r.body)}
              </p>
              <Link
                to="/anmelden"
                search={{ role: r.role, mode: "signin" }}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
              >
                {tr(r.cta)}
              </Link>
              <Link
                to="/anmelden"
                search={{ role: r.role, mode: "signup" }}
                className="mt-2 text-center text-xs font-semibold text-primary"
              >
                {tr(["Neues Konto anlegen", "Create a new account"])}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6">
        <div className="surface-card border-destructive/30 bg-destructive-soft p-6">
          <h2 className="font-display text-lg font-semibold text-destructive">
            {tr(["Wenn es Ihnen jetzt sehr schlecht geht", "If you are in crisis right now"])}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed">
            {tr([
              "Warten Sie nicht auf den Fragebogen. Rufen Sie 112 an, wenden Sie sich an den ärztlichen Bereitschaftsdienst unter 116 117 oder an die Telefonseelsorge unter 0800 111 0 111.",
              "Do not wait for the questionnaire. Call 112, contact the out-of-hours medical service on 116 117, or call a crisis line on 0800 111 0 111.",
            ])}
          </p>
          <Link
            to="/soforthilfe"
            className="mt-4 inline-flex rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground"
          >
            {tr(ui.crisis)}
          </Link>
        </div>
      </section>
    </div>
  );
}
