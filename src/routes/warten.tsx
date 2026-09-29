import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardIcon } from "@/components/icons";
import { EmptyState } from "@/components/PageHero";
import { ui, useLang } from "@/lib/i18n";
import { usePrediction } from "@/lib/usePrediction";
import { WaitingBlocker } from "@/components/WaitingBlocker";
import wartezimmerContent from "@/content/wartezimmer.json";

export const Route = createFileRoute("/warten")({
  head: () => ({
    meta: [{ title: "Bitte warten | Depressions-Kompass" }],
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
      <EmptyState
        icon={<ClipboardIcon className="h-6 w-6" />}
        title={tr(w.blocked.title)}
        body={tr(ui.noData)}
      >
        <Link
          to="/fragebogen"
          className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(ui.buttons.start)}
        </Link>
      </EmptyState>
    );
  }

  return <WaitingBlocker />;
}
