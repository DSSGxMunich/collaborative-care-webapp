import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ui, useLang } from "@/lib/i18n";
import { usePrediction } from "@/lib/usePrediction";
import wartezimmerContent from "@/content/wartezimmer.json";

export const Route = createFileRoute("/warten")({
  head: () => ({
    meta: [{ title: "Bitte warten – Depressions-Kompass" }],
  }),
  component: Waiting,
});

const w = wartezimmerContent;

function Waiting() {
  const { tr } = useLang();
  const navigate = useNavigate();
  const p = usePrediction();

  if (!p.hydrated) return <div className="mx-auto max-w-xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">{tr(w.blocked.title)}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{tr(ui.noData)}</p>
        <Link
          to="/fragebogen"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(ui.buttons.start)}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{tr(w.blocked.title)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(w.blocked.body)}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {tr(w.blocked.waitingNote)}
      </p>

      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={() => navigate({ to: "/ergebnis" })}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          {tr(w.blocked.continueWithGp)}
        </button>
        <p className="text-center text-xs text-muted-foreground">{tr(w.blocked.continueHint)}</p>
        <Link
          to="/angebote"
          className="block w-full rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium hover:bg-secondary"
        >
          {tr(w.blocked.seeSupport)}
        </Link>
        <Link
          to="/"
          className="block pt-1 text-center text-xs text-muted-foreground underline underline-offset-2"
        >
          {tr(w.blocked.backHome)}
        </Link>
      </div>
    </div>
  );
}
