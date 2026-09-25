import { createFileRoute, Link } from "@tanstack/react-router";
import { ui, useLang } from "@/lib/i18n";
import { usePrediction } from "@/lib/usePrediction";
import { WaitingBlocker } from "@/components/WaitingBlocker";
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

  return <WaitingBlocker />;
}
