import { createFileRoute, Link } from "@tanstack/react-router";
import { CRISIS_CONTACTS } from "@/lib/social";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/soforthilfe")({
  head: () => ({
    meta: [
      { title: "Soforthilfe und Krisenkontakte – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Notruf 112, ärztlicher Bereitschaftsdienst 116 117, Telefonseelsorge 0800 111 0 111: Kontakte und konkrete Schritte bei akuter Krise oder Suizidgedanken.",
      },
      { property: "og:title", content: "Soforthilfe und Krisenkontakte" },
      {
        property: "og:description",
        content: "Kostenlose, rund um die Uhr erreichbare Hilfsangebote bei akuter seelischer Krise.",
      },
    ],
  }),
  component: Crisis,
});

function Crisis() {
  const { tr } = useLang();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-destructive">
        {tr(["Soforthilfe", "Urgent help"])}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {tr([
          "Wenn Sie daran denken, sich das Leben zu nehmen, oder das Gefühl haben, sich nicht schützen zu können: Holen Sie sich jetzt Hilfe. Diese Stellen sind kostenlos, vertraulich und erfahren im Umgang mit solchen Situationen.",
          "If you are thinking about ending your life, or feel unable to keep yourself safe: get help now. These services are free, confidential and experienced with such situations.",
        ])}
      </p>

      <ul className="mt-8 space-y-3">
        {CRISIS_CONTACTS.map((c) => (
          <li key={c.detail} className="surface-card flex flex-wrap items-baseline gap-x-4 gap-y-1 p-5">
            <span className="font-display text-lg font-semibold">{tr(c.name)}</span>
            <span className="font-display text-lg font-bold text-primary">{c.detail}</span>
            <span className="w-full text-sm text-muted-foreground">{tr(c.note)}</span>
          </li>
        ))}
      </ul>

      <div className="surface-card mt-8 p-6">
        <h2 className="font-display text-lg font-semibold">
          {tr(["Was jetzt hilft", "What helps right now"])}
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {[
            [
              "Bleiben Sie möglichst nicht allein – rufen Sie eine Person an, der Sie vertrauen.",
              "Try not to stay alone — call someone you trust.",
            ],
            [
              "Entfernen Sie Gegenstände, mit denen Sie sich verletzen könnten, aus Ihrer Reichweite.",
              "Move anything you could harm yourself with out of reach.",
            ],
            [
              "Vereinbaren Sie einen konkreten nächsten Schritt: Anruf, Fahrt zur Klinik, Termin morgen früh.",
              "Agree on one concrete next step: a phone call, a trip to hospital, an appointment tomorrow morning.",
            ],
            [
              "Sagen Sie Ihrer Hausarztpraxis beim nächsten Kontakt, wie es Ihnen wirklich geht.",
              "Tell your GP practice at your next contact how you are really doing.",
            ],
          ].map((line) => (
            <li key={line[1]} className="flex gap-2">
              <span aria-hidden className="text-primary">
                •
              </span>
              {tr(line as [string, string])}
            </li>
          ))}
        </ul>
      </div>

      <Link to="/" className="mt-8 inline-flex text-sm font-semibold text-primary underline">
        {tr(["Zurück zur Startseite", "Back to the start page"])}
      </Link>
    </div>
  );
}
