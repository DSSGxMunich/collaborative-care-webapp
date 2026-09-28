import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LockIcon } from "@/components/icons";
import { IconTile } from "@/components/PageHero";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { computeUnlockCode, normalizeUnlockCode } from "@/lib/unlockCode";
import praxisContent from "@/content/praxis.json";

type GpUnlockError = "mismatch" | "noSession" | null;

/** Where to go once the code matches: stay on the practice report, or open the patient's results. */
type UnlockTarget = "praxis" | "ergebnis";

/**
 * The GP-side half of the waiting-room gate: the patient's screen
 * (WaitingBlocker) shows a code, and the GP types it in here — on the
 * "For the practice" page (src/routes/praxis.tsx). One code unlocks both
 * the practice report and the patient's results (they share
 * session.unlocked); the two buttons only decide which one opens first.
 */
export function GpUnlockCard() {
  const { tr } = useLang();
  const navigate = useNavigate();
  const { session, update } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<GpUnlockError>(null);
  const g = praxisContent.unlock;

  const tryUnlock = (target: UnlockTarget) => {
    if (session.mode !== "waitingRoom" || !session.completedAt) {
      setError("noSession");
      return;
    }
    if (normalizeUnlockCode(code) === computeUnlockCode(session)) {
      update({ unlocked: true });
      // /praxis re-renders into the report on its own once unlocked.
      if (target === "ergebnis") navigate({ to: "/ergebnis" });
    } else {
      setError("mismatch");
    }
  };

  return (
    <div className="panel max-w-xl p-6">
      <div className="flex items-center gap-3">
        <IconTile>
          <LockIcon className="h-5 w-5" />
        </IconTile>
        <h2 className="text-lg font-semibold">{tr(g.title)}</h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(g.body)}</p>
      <form
        onSubmit={(e) => {
          // Enter in the code field opens the practice report — the page the GP is already on.
          e.preventDefault();
          tryUnlock("praxis");
        }}
        className="mt-4 flex flex-wrap gap-2"
      >
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder={tr(g.codePlaceholder)}
          aria-label={tr(g.codePlaceholder)}
          autoComplete="off"
          maxLength={8}
          className="w-32 rounded-md border border-input bg-background px-2.5 py-2 text-sm font-mono uppercase tracking-widest outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(g.unlockPraxis)}
        </button>
        <button
          type="button"
          onClick={() => tryUnlock("ergebnis")}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          {tr(g.unlockResults)}
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
