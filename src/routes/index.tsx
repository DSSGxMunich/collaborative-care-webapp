import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, ui, type L } from "@/lib/i18n";
import heroImage from "@/assets/hero-calm.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Depressions-Kompass – Vorhersage-Tool für Depressionsversorgung" },
      {
        name: "description",
        content:
          "Fragebogen mit PHQ-9, Sicherheitsalgorithmus und evidenzinformierter Vorhersage: Welche Bausteine strukturierter Depressionsversorgung passen zu welchem Patientenprofil?",
      },
      {
        property: "og:title",
        content: "Depressions-Kompass – Vorhersage-Tool für Depressionsversorgung",
      },
      {
        property: "og:description",
        content:
          "Patientenfragebogen, Risikoprüfung und patientenindividuelle Vorhersage von Behandlungsergebnissen für die hausärztliche Praxis.",
      },
    ],
  }),
  component: Index,
});

const steps: { n: string; title: L; body: L }[] = [
  {
    n: "1",
    title: ["Fragebogen ausfüllen", "Complete the questionnaire"],
    body: [
      "PHQ-9 sowie wenige Angaben zu Beschwerdedauer, Lebenssituation und Vorlieben. Etwa 5–8 Minuten, in der Praxis oder zu Hause.",
      "The PHQ-9 plus a few questions on symptom duration, life situation and preferences. About 5–8 minutes, at the practice or at home.",
    ],
  },
  {
    n: "2",
    title: ["Sicherheitsprüfung", "Safety check"],
    body: [
      "Hinweise auf akute Belastung oder Suizidgedanken lösen sofort klare Handlungsempfehlungen und Krisenkontakte aus.",
      "Signs of acute distress or suicidal thoughts immediately trigger clear guidance and crisis contacts.",
    ],
  },
  {
    n: "3",
    title: ["Vorhersage ansehen", "See the prediction"],
    body: [
      "Geschätzte Verläufe unter üblicher Versorgung und unter einzelnen bzw. kombinierten Versorgungsbausteinen – für Profile wie Ihres.",
      "Estimated outcomes under usual care and under single or combined care components — for profiles like yours.",
    ],
  },
  {
    n: "4",
    title: ["Mit der Praxis besprechen", "Discuss with the practice"],
    body: [
      "Eine kompakte Übersicht für Ärztin oder Arzt plus passende Angebote im Wohnumfeld.",
      "A compact summary for the clinician plus suitable offers in your local area.",
    ],
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
                "Welche Depressionsbehandlung passt zu mir?",
                "Which depression care is likely to help me?",
              ])}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {tr([
                "Der Depressions-Kompass verbindet Ihre Antworten mit Ergebnissen aus einer Metaanalyse individueller Patientendaten und schätzt, wie sich Ihre Beschwerden unter verschiedenen Bausteinen strukturierter Depressionsversorgung entwickeln könnten.",
                "Depression Compass links your answers to results from an individual-patient-data meta-analysis and estimates how your symptoms might develop under different components of structured depression care.",
              ])}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/fragebogen"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
              >
                {tr(ui.start)}
              </Link>
              <Link
                to="/praxis"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                {tr(["Ansicht für die Praxis", "View for the practice"])}
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              {tr([
                "Keine Anmeldung. Ihre Antworten bleiben auf diesem Gerät und werden nicht übertragen.",
                "No sign-up. Your answers stay on this device and are not transmitted.",
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

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="font-display text-2xl font-semibold">
          {tr(["So läuft es ab", "How it works"])}
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.n} className="surface-card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent-foreground">
                {s.n}
              </span>
              <h3 className="mt-3 text-base font-semibold">{tr(s.title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(s.body)}</p>
            </li>
          ))}
        </ol>
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
            {tr(["Alle Krisenkontakte", "All crisis contacts"])}
          </Link>
        </div>
      </section>
    </div>
  );
}
