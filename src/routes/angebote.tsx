import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLinkIcon, MapPinIcon, SearchIcon } from "@/components/icons";
import { PageBody, PageHero } from "@/components/PageHero";
import { fill, useLang } from "@/lib/i18n";
import supportContent from "@/content/support.json";

export const Route = createFileRoute("/angebote")({
  head: () => ({
    meta: [
      { title: "Angebote vor Ort | Versorgungskompass" },
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
    <>
      <PageHero icon={<MapPinIcon className="h-6 w-6" />} title={tr(s.title)} intro={tr(s.intro)}>
        {/* Same grid as the offer cards below, so the box is exactly one card wide. */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel p-5">
            <label htmlFor="place" className="text-sm font-semibold">
              {tr(s.locationLabel)}
            </label>
            <p className="mt-1 text-xs text-muted-foreground">{tr(s.locationHint)}</p>
            <div className="relative mt-3">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="place"
                value={place}
                onChange={(e) => setPlace(e.target.value.slice(0, 80))}
                placeholder={tr(s.locationPlaceholder)}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </PageHero>

      <PageBody className="space-y-10">
        {s.categories.map((category) => (
          <section key={category.id}>
            <h2 className="text-xl font-bold tracking-tight">{tr(category.label)}</h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {category.offers.map((offer) => (
                <li key={offer.id} className="panel flex flex-col p-5">
                  <h3 className="text-base font-semibold">{tr(offer.title)}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {tr(offer.body)}
                  </p>
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="font-medium">{tr(s.whereToFind)}: </span>
                    {tr(offer.route)}
                  </p>
                  {/* Official directories first; the Google search below is only a fallback. */}
                  <ul className="mt-3 space-y-1.5">
                    {offer.links.map((link) => (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2"
                        >
                          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                          {tr(link.label)}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={searchLink(tr(offer.searchTerm))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    <SearchIcon className="h-4 w-4" />
                    {place ? fill(tr(s.searchInPlace), { place }) : tr(s.searchInArea)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </PageBody>
    </>
  );
}
