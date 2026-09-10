import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fill, useLang } from "@/lib/i18n";
import supportContent from "@/content/support.json";

export const Route = createFileRoute("/angebote")({
  head: () => ({
    meta: [
      { title: "Angebote vor Ort – Depressions-Kompass" },
      { name: "description", content: supportContent.intro.de },
    ],
  }),
  component: Support,
});

const s = supportContent;

function Support() {
  const { tr } = useLang();
  const [place, setPlace] = useState("");

  const searchLink = (term: string) =>
    `https://www.google.com/search?q=${encodeURIComponent(`${term} ${place}`.trim())}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">{tr(s.title)}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{tr(s.intro)}</p>

      <div className="surface-card mt-6 p-5">
        <label htmlFor="place" className="text-sm font-semibold">
          {tr(s.locationLabel)}
        </label>
        <p className="mt-1 text-xs text-muted-foreground">{tr(s.locationHint)}</p>
        <input
          id="place"
          value={place}
          onChange={(e) => setPlace(e.target.value.slice(0, 80))}
          placeholder={tr(s.locationPlaceholder)}
          className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {s.categories.map((category) => (
        <section key={category.id} className="mt-8">
          <h2 className="font-display text-xl font-semibold">{tr(category.label)}</h2>
          <ul className="mt-4 space-y-4">
            {category.offers.map((offer) => (
              <li key={offer.id} className="surface-card p-5">
                <h3 className="font-display text-lg font-semibold">{tr(offer.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {tr(offer.body)}
                </p>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">{tr(s.whereToFind)}: </span>
                  {tr(offer.route)}
                </p>
                <a
                  href={searchLink(tr(offer.searchTerm))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-primary underline"
                >
                  {place ? fill(tr(s.searchInPlace), { place }) : tr(s.searchInArea)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
