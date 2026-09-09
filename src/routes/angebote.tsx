import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLang, ui } from "@/lib/i18n";
import { usePrediction } from "@/lib/usePrediction";
import { OFFER_CATEGORIES, PERSONALISATION_NOTE, SOCIAL_OFFERS } from "@/lib/social";
import { PROTOTYPE_NOTE } from "@/lib/model";

export const Route = createFileRoute("/angebote")({
  head: () => ({
    meta: [
      { title: "Angebote vor Ort – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Nach Fragebogenantworten ausgewählte Kategorien niedrigschwelliger Angebote: Bewegung, Selbsthilfe, soziale Beratung, digitale Unterstützung, Entlastung für pflegende Angehörige – anschließend nach Ort gesucht.",
      },
      { property: "og:title", content: "Angebote vor Ort – Social Prescribing" },
      {
        property: "og:description",
        content:
          "Erst passende Kategorien aus Ihren Antworten, dann Suche nach Angeboten in Ihrer Region.",
      },
    ],
  }),
  component: Support,
});

function Support() {
  const { tr } = useLang();
  const p = usePrediction();
  const [place, setPlace] = useState("");

  const matched = p.complete ? p.categories : [];
  const shownCategoryIds = matched.map((m) => m.category.id);
  const otherCategories = OFFER_CATEGORIES.filter((c) => !shownCategoryIds.includes(c.id));

  const searchLink = (term: string) =>
    `https://www.google.com/search?q=${encodeURIComponent(`${term} ${place}`.trim())}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">
        {tr(["Angebote vor Ort", "Local support offers"])}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {p.complete
          ? tr([
              "Aus Ihren Antworten wurden zuerst passende Kategorien ausgewählt. Innerhalb dieser Kategorien können Sie danach gezielt nach Angeboten in Ihrer Nähe suchen.",
              "Relevant categories were selected from your answers first. Within these categories you can then search specifically for offers near you.",
            ])
          : tr([
              "Ohne Fragebogen kann nichts zugeschnitten werden. Nach dem Fragebogen werden nur die für Sie relevanten Kategorien angezeigt.",
              "Without the questionnaire nothing can be tailored. After completing it, only the categories relevant to you are shown.",
            ])}
      </p>

      <div className="mt-4 rounded-2xl border border-warning/50 bg-accent-soft p-4">
        <p className="text-sm leading-relaxed">{tr(PERSONALISATION_NOTE)}</p>
      </div>

      <div className="surface-card mt-6 p-5">
        <label htmlFor="place" className="text-sm font-semibold">
          {tr(["Ort oder Postleitzahl", "Town or postcode"])}
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          {tr([
            "Wird nur genutzt, um Suchlinks vorzubereiten – die Eingabe verlässt dieses Gerät nicht.",
            "Only used to prepare search links — your entry does not leave this device.",
          ])}
        </p>
        <input
          id="place"
          value={place}
          onChange={(e) => setPlace(e.target.value.slice(0, 60))}
          placeholder={tr(["z. B. 37073 oder Göttingen", "e.g. 37073 or Göttingen"])}
          className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {p.complete && matched.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">
          {tr([
            "Aus Ihren Antworten ergibt sich derzeit keine spezifische Kategorie. Sprechen Sie in der Praxis an, was Sie sich vorstellen könnten.",
            "Your answers currently do not point to a specific category. Discuss at the practice what you could imagine.",
          ])}
        </p>
      )}

      {matched.map((m) => (
        <section key={m.category.id} className="mt-8">
          <h2 className="font-display text-xl font-semibold">{tr(m.category.label)}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              {tr(["Warum ausgewählt", "Why selected"])}:{" "}
            </span>
            {tr(m.reason)}
          </p>
          <ul className="mt-4 space-y-4">
            {m.offers.map((o) => (
              <li key={o.id} className="surface-card p-5">
                <h3 className="font-display text-lg font-semibold">{tr(o.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(o.body)}</p>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">
                    {tr(["Wo zu finden", "Where to find it"])}:{" "}
                  </span>
                  {tr(o.route)}
                </p>
                <a
                  href={searchLink(tr(o.searchTerm))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-primary underline"
                >
                  {place
                    ? tr([`In ${place} suchen`, `Search in ${place}`])
                    : tr(["In meiner Region suchen", "Search in my area"])}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {p.complete && otherCategories.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">
            {tr(["Nicht ausgewählte Kategorien", "Categories not selected"])}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {tr([
              "Diese Bereiche wurden anhand Ihrer Antworten nicht vorgeschlagen – auf Wunsch können sie in der Praxis dennoch besprochen werden.",
              "These areas were not suggested based on your answers — they can still be discussed at the practice if you wish.",
            ])}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {otherCategories.map((c) => (
              <li
                key={c.id}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {tr(c.label)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!p.complete && (
        <>
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold">
              {tr(["Allgemeine Übersicht", "General overview"])}
            </h2>
            <ul className="mt-4 space-y-3">
              {SOCIAL_OFFERS.map((o) => (
                <li key={o.id} className="surface-card p-4">
                  <h3 className="font-display text-base font-semibold">{tr(o.title)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tr(o.route)}</p>
                </li>
              ))}
            </ul>
          </section>
          <Link
            to="/fragebogen"
            className="mt-8 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            {tr(ui.start)}
          </Link>
        </>
      )}

      <p className="mt-10 text-xs leading-relaxed text-muted-foreground">{tr(PROTOTYPE_NOTE)}</p>
    </div>
  );
}
