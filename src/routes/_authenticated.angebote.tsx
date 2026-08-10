import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLang, ui } from "@/lib/i18n";
import { usePrediction } from "@/lib/usePrediction";
import { SOCIAL_OFFERS } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/angebote")({
  head: () => ({
    meta: [
      { title: "Angebote vor Ort – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Niedrigschwellige Angebote passend zum Profil: Bewegungsgruppen, Selbsthilfe, Präventionskurse der Krankenkassen, DiGA und soziale Beratung in Deutschland.",
      },
      { property: "og:title", content: "Angebote vor Ort – Social Prescribing" },
      {
        property: "og:description",
        content: "Konkrete Kurse, Gruppen und Beratungsstellen, abgestimmt auf Ihre Situation.",
      },
    ],
  }),
  component: Support,
});

function Support() {
  const { tr } = useLang();
  const p = usePrediction();
  const [place, setPlace] = useState("");

  const offers = p.complete ? p.offers : SOCIAL_OFFERS;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">
        {tr(["Angebote vor Ort", "Local support offers"])}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {p.complete
          ? tr([
              "Diese Angebote passen zu Ihren Angaben. Sie ergänzen die Behandlung und sind meist kostenlos oder von der Krankenkasse bezuschusst.",
              "These offers fit your answers. They complement treatment and are usually free or subsidised by your health insurer.",
            ])
          : tr([
              "Allgemeine Übersicht. Nach dem Fragebogen wird die Liste auf Ihre Situation zugeschnitten.",
              "General overview. After the questionnaire this list is tailored to your situation.",
            ])}
      </p>

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

      <ul className="mt-8 space-y-4">
        {offers.map((o) => (
          <li key={o.id} className="surface-card p-5">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold">
              {tr(o.category)}
            </span>
            <h2 className="mt-3 font-display text-lg font-semibold">{tr(o.title)}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(o.body)}</p>
            <p className="mt-3 text-sm">
              <span className="font-semibold">{tr(["Wo zu finden", "Where to find it"])}: </span>
              {tr(o.route)}
            </p>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${tr(o.title)} ${place}`.trim())}`}
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

      {!p.complete && (
        <Link
          to="/fragebogen"
          className="mt-8 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          {tr(ui.start)}
        </Link>
      )}
    </div>
  );
}
