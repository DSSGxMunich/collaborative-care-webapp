import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ui, useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import home from "@/content/home.json";
import wartezimmerContent from "@/content/wartezimmer.json";

export const Route = createFileRoute("/wartezimmer")({
  head: () => ({
    meta: [
      { title: "Wartezimmer – Depressions-Kompass" },
      { name: "description", content: wartezimmerContent.start.body.de },
    ],
  }),
  component: WaitingRoomStart,
});

const w = wartezimmerContent;

function WaitingRoomStart() {
  const { tr } = useLang();
  const navigate = useNavigate();
  const { update } = useSession();

  const start = () => {
    update({ mode: "waitingRoom" });
    navigate({ to: "/fragebogen" });
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {tr(ui.researchPrototype)}
      </p>
      <h1 className="mt-3 text-balance-tight text-2xl font-semibold leading-snug sm:text-3xl">
        {tr(w.start.title)}
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        {tr(w.start.body)}
      </p>
      <div className="mt-7">
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(w.start.start)}
        </button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{tr(w.start.note)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{tr(ui.noAnswersLeaveDevice)}</p>

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
