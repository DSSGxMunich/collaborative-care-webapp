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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-destructive">{tr(c.title)}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{tr(c.intro)}</p>

      <ul className="mt-8 space-y-3">
        {c.contacts.map((contact) => (
          <li
            key={contact.detail}
            className="surface-card flex flex-wrap items-baseline gap-x-4 gap-y-1 p-5"
          >
            <span className="font-display text-lg font-semibold">{tr(contact.name)}</span>
            <span className="font-display text-lg font-bold text-primary">{contact.detail}</span>
            <span className="w-full text-sm text-muted-foreground">{tr(contact.note)}</span>
          </li>
        ))}
      </ul>

      <div className="surface-card mt-8 p-6">
        <h2 className="font-display text-lg font-semibold">{tr(c.helpNowTitle)}</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
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

      <Link to="/" className="mt-8 inline-flex text-sm font-semibold text-primary underline">
        {tr(c.backHome)}
      </Link>
    </div>
  );
}
