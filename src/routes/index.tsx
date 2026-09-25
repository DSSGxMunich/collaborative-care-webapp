import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { useLang, ui } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { computeUnlockCode, normalizeUnlockCode } from "@/lib/unlockCode";
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

type GpUnlockError = "mismatch" | "noSession" | null;

function GpUnlockCard() {
  const { tr } = useLang();
  const navigate = useNavigate();
  const { session, update } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<GpUnlockError>(null);
  const g = home.entries.gp;

  const tryUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (session.mode !== "waitingRoom" || !session.completedAt) {
      setError("noSession");
      return;
    }
    if (normalizeUnlockCode(code) === computeUnlockCode(session)) {
      update({ unlocked: true });
      navigate({ to: "/ergebnis" });
    } else {
      setError("mismatch");
    }
  };

  return (
    <div className="rounded-md border border-border p-5">
      <h3 className="text-sm font-semibold">{tr(g.title)}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(g.body)}</p>
      <form onSubmit={tryUnlock} className="mt-4 flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder={tr(g.codePlaceholder)}
          autoComplete="off"
          maxLength={8}
          className="w-32 rounded-md border border-input bg-background px-2.5 py-2 text-sm font-mono uppercase tracking-widest outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          {tr(g.unlockButton)}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs text-destructive">
          {tr(error === "noSession" ? g.noSession : g.codeMismatch)}
        </p>
      )}
    </div>
  );
}

function Index() {
  const { tr } = useLang();
  const { update } = useSession();
  const e = home.entries;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tr(ui.researchPrototype)}
        </p>
        <InfoTooltip
          description={tr(home.prototypeInfo.note)}
          ariaLabel={tr(ui.moreInfo)}
          panelClassName="w-72"
          triggerClassName="flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-muted-foreground/60 text-[10px] font-semibold leading-none text-muted-foreground hover:border-muted-foreground hover:text-foreground"
        >
          <span aria-hidden="true">?</span>
        </InfoTooltip>
      </div>
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

      <div className="mt-8 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">{tr(e.heading)}</h2>

        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-border p-5">
            <h3 className="text-sm font-semibold">{tr(e.together.title)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {tr(e.together.body)}
            </p>
            <Link
              to="/fragebogen"
              onClick={() => update({ mode: "clinic", unlocked: false })}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {tr(e.together.cta)}
            </Link>
          </div>

          <div className="rounded-md border border-border p-5">
            <h3 className="text-sm font-semibold">{tr(e.waitingRoom.title)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {tr(e.waitingRoom.body)}
            </p>
            <Link
              to="/wartezimmer"
              className="mt-4 inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              {tr(e.waitingRoom.cta)}
            </Link>
          </div>

          <GpUnlockCard />
        </div>

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
