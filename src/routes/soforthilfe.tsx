import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import crisisContent from "@/content/crisis.json";

export const Route = createFileRoute("/soforthilfe")({
  head: () => ({
    meta: [
      { title: "Soforthilfe und Krisenkontakte – Depressions-Kompass" },
      { name: "description", content: crisisContent.intro.de },
    ],
  }),
  component: Crisis,
});

const c = crisisContent;

function Crisis() {
  const { tr } = useLang();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-destructive">{tr(c.title)}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{tr(c.intro)}</p>

      <ul className="mt-8 divide-y divide-border border-y border-border">
        {c.contacts.map((contact) => (
          <li key={contact.detail} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
            <span className="text-sm font-medium">{tr(contact.name)}</span>
            <span className="text-base font-semibold text-primary">{contact.detail}</span>
            <span className="w-full text-sm text-muted-foreground">{tr(contact.note)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-md border border-border p-4">
        <h2 className="text-sm font-semibold">{tr(c.helpNowTitle)}</h2>
        <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {c.helpNowItems.map((line) => (
            <li key={line.en} className="flex gap-2">
              <span aria-hidden className="text-primary">
                •
              </span>
              {tr(line)}
            </li>
          ))}
        </ul>
      </div>

      <Link
        to="/"
        className="mt-8 inline-flex text-sm font-medium text-primary underline underline-offset-2"
      >
        {tr(c.backHome)}
      </Link>
    </div>
  );
}
