import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, ui } from "@/lib/i18n";
import home from "@/content/home.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Depressions-Kompass" },
      { name: "description", content: home.body.de },
      { property: "og:title", content: "Depressions-Kompass" },
      { property: "og:description", content: home.body.de },
    ],
  }),
  component: Index,
});

function Index() {
  const { tr } = useLang();

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {tr(ui.researchPrototype)}
      </p>
      <h1 className="mt-3 text-balance-tight text-2xl font-semibold leading-snug sm:text-3xl">
        {tr(home.title)}
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{tr(home.body)}</p>
      <div className="mt-7">
        <Link
          to="/fragebogen"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(ui.buttons.start)}
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{tr(ui.noAnswersLeaveDevice)}</p>

      <div className="mt-12 border-t border-border pt-6">
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
