import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LockIcon } from "@/components/icons";
import { IconTile } from "@/components/PageHero";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { computeUnlockCode, normalizeUnlockCode } from "@/lib/unlockCode";
import praxisContent from "@/content/praxis.json";

type GpUnlockError = "mismatch" | "noSession" | null;

/**
 * The GP-side half of the waiting-room gate: the patient's screen
 * (WaitingBlocker) shows a code, and the GP types it in here — on the
 * "For the practice" page (src/routes/praxis.tsx) — to unlock the results.
 */
export function GpUnlockCard() {
  const { tr } = useLang();
  const navigate = useNavigate();
  const { session, update } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<GpUnlockError>(null);
  const g = praxisContent.unlock;

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
    <div className="panel max-w-xl p-6">
      <div className="flex items-center gap-3">
        <IconTile>
          <LockIcon className="h-5 w-5" />
        </IconTile>
        <h2 className="text-lg font-semibold">{tr(g.title)}</h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(g.body)}</p>
      <form onSubmit={tryUnlock} className="mt-4 flex gap-2">
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
