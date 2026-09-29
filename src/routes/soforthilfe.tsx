import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertIcon, ClockIcon, PhoneIcon } from "@/components/icons";
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
        titleClassName="text-foreground"
        intro={tr(c.intro)}
      />
      <PageBody>
        <ul className="grid gap-4 sm:grid-cols-2">
          {c.contacts.map((contact) => (
            <li key={contact.numbers[0]} className="panel flex gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive">
                <PhoneIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-medium text-foreground">{tr(contact.name)}</h2>
                <ul className="mt-0.5">
                  {contact.numbers.map((number) => (
                    <li key={number}>
                      <a
                        href={`tel:${number.replace(/[^\d+]/g, "")}`}
                        className="text-2xl font-bold tabular-nums tracking-tight text-foreground"
                      >
                        {number}
                      </a>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                  <div className="flex gap-2">
                    <dt className="sr-only">{tr(c.hoursLabel)}</dt>
                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <dd className="font-medium text-foreground">
                      {/* one line per time slot, e.g. "Mon, Tue, Thu …" / "Wed, Fri …" */}
                      {tr(contact.hours)
                        .split(" · ")
                        .map((slot) => (
                          <span key={slot} className="block">
                            {slot}
                          </span>
                        ))}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">{tr(c.noteLabel)}</dt>
                    <dd className="text-muted-foreground">{tr(contact.note)}</dd>
                  </div>
                </dl>
                {"url" in contact && (
                  <a
                    href={contact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm font-medium text-foreground underline underline-offset-2"
                  >
                    {contact.url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive-soft p-6">
          <h2 className="text-base font-semibold text-foreground">{tr(c.helpNowTitle)}</h2>
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
