import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CrisisNote } from "@/components/CrisisNote";
import { ArrowIcon, ChairIcon, ClockIcon, ShieldIcon } from "@/components/icons";
import { PageBody, PageHero } from "@/components/PageHero";
import { ui, useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import wartezimmerContent from "@/content/wartezimmer.json";

export const Route = createFileRoute("/wartezimmer")({
  head: () => ({
    meta: [
      { title: "Wartezimmer | Versorgungskompass" },
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
    update({ mode: "waitingRoom", unlocked: false });
    navigate({ to: "/fragebogen" });
  };

  return (
    <>
      <PageHero
        icon={<ChairIcon className="h-6 w-6" />}
        title={tr(w.start.title)}
        intro={tr(w.start.body)}
      >
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          {tr(w.start.start)}
          <ArrowIcon className="h-4 w-4" />
        </button>
        <div className="mt-5 space-y-1.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4 shrink-0" />
            {tr(w.start.note)}
          </p>
          <p className="flex items-center gap-1.5">
            <ShieldIcon className="h-4 w-4 shrink-0" />
            {tr(ui.noAnswersLeaveDevice)}
          </p>
        </div>
      </PageHero>
      <PageBody>
        <CrisisNote />
      </PageBody>
    </>
  );
}
