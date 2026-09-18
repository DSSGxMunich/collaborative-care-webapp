import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoTooltip } from "@/components/InfoTooltip";
import { useLang, ui } from "@/lib/i18n";
import home from "@/content/home.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Versorgungskompass" },
      { name: "description", content: home.body.de },
      { property: "og:title", content: "Versorgungskompass" },
      { property: "og:description", content: home.body.de },
    ],
  }),
  component: Index,
});

function Index() {
  const { tr } = useLang();

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <InfoTooltip
        label={tr(ui.researchPrototype)}
        triggerClassName="cursor-help border-b border-dotted border-muted-foreground/60 text-xs font-medium uppercase tracking-wide text-muted-foreground"
        panelClassName="w-72"
        description={
          <div className="space-y-1.5">
            {home.prototypeInfo.items.map((item, i) => (
              <p key={i}>{tr(item)}</p>
            ))}
          </div>
        }
      />
      <h1 className="mt-3 text-balance-tight text-2xl font-semibold leading-snug sm:text-3xl">
        {tr(home.title)}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{tr(home.body)}</p>

      <div className="mt-8 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">{tr(home.about.heading)}</h2>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {home.about.items.map((item, i) => (
            <li key={i}>{tr(item)}</li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <Link
          to="/fragebogen"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(ui.buttons.start)}
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">{tr(ui.noAnswersLeaveDevice)}</p>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-destructive">{tr(home.crisisTitle)}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {tr(home.crisisBody)}
        </p>
        <Link
          to="/soforthilfe"
          className="mt-3 inline-flex text-sm font-medium text-destructive underline underline-offset-2"
        >
          {tr(home.crisisLink)}
        </Link>
      </div>
    </div>
  );
}
