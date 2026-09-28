import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertIcon, PhoneIcon } from "@/components/icons";
import { PageBody, PageHero } from "@/components/PageHero";
import { useLang } from "@/lib/i18n";
import crisisContent from "@/content/crisis.json";

export const Route = createFileRoute("/soforthilfe")({
  head: () => ({
    meta: [
      { title: "Soforthilfe und Krisenkontakte | Versorgungskompass" },
      { name: "description", content: crisisContent.intro.de },
    ],
  }),
  component: Crisis,
});

const c = crisisContent;

function Crisis() {
  const { tr } = useLang();
  return (
    <>
      <PageHero
        icon={<AlertIcon className="h-6 w-6" />}
        tone="destructive"
        title={tr(c.title)}
        titleClassName="text-destructive"
        intro={tr(c.intro)}
      />
      <PageBody>
        <ul className="grid gap-4 sm:grid-cols-2">
          {c.contacts.map((contact) => (
            <li key={contact.detail} className="panel flex gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive">
                <PhoneIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{tr(contact.name)}</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-primary">
                  {contact.detail}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{tr(contact.note)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive-soft p-6">
          <h2 className="text-base font-semibold text-destructive">{tr(c.helpNowTitle)}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/80">
            {c.helpNowItems.map((line) => (
              <li key={line.en} className="flex gap-2">
                <span aria-hidden className="text-destructive">
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
      </PageBody>
    </>
  );
}
