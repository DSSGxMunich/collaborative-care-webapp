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
    <div className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
      <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
        {tr(ui.researchPrototype)}
      </p>
      <h1 className="mt-5 text-balance-tight font-display text-3xl font-semibold leading-tight sm:text-4xl">
        {tr(home.title)}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        {tr(home.body)}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          to="/fragebogen"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
        >
          {tr(ui.buttons.start)}
        </Link>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">{tr(ui.noAnswersLeaveDevice)}</p>

      <div className="surface-card mt-10 border-destructive/30 bg-destructive-soft p-6">
        <h2 className="font-display text-lg font-semibold text-destructive">
          {tr(home.crisisTitle)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed">{tr(home.crisisBody)}</p>
        <Link
          to="/soforthilfe"
          className="mt-4 inline-flex rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground"
        >
          {tr(home.crisisLink)}
        </Link>
      </div>
    </div>
  );
}
