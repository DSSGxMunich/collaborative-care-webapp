import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LockIcon } from "@/components/icons";
import { IconTile } from "@/components/PageHero";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { CODE_LENGTH, decodeAnswers } from "@/lib/unlockCode";
import praxisContent from "@/content/praxis.json";

/**
 * The GP-side half of the waiting-room gate: the patient's screen
 * (WaitingBlocker) shows a code, and the GP types it in here — on the
 * "Practice" page (src/routes/praxis.tsx) — on any device. The code carries
 * the answers themselves (see unlockCode.ts), so entering it replaces
 * whatever session this device held with the patient's, already unlocked.
 */
export function GpUnlockCard() {
  const { tr } = useLang();
  const navigate = useNavigate();
  const { update } = useSession();
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const g = praxisContent.unlock;

  const tryUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const answers = decodeAnswers(code);
    if (!answers) {
      setInvalid(true);
      return;
    }
    update({
      ...answers,
      completedAt: new Date().toISOString(),
      mode: "waitingRoom",
      unlocked: true,
    });
    navigate({ to: "/ergebnis" });
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
            setInvalid(false);
          }}
          placeholder={tr(g.codePlaceholder)}
          aria-label={tr(g.codePlaceholder)}
          autoComplete="off"
          // Room for the dashes of a formatted code ("7K3M-Q9XA-4TR").
          maxLength={CODE_LENGTH + 4}
          className="w-44 rounded-md border border-input bg-background px-2.5 py-2 text-sm font-mono uppercase tracking-widest outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {tr(g.unlockButton)}
        </button>
      </form>
      {invalid && <p className="mt-2 text-xs text-destructive">{tr(g.codeInvalid)}</p>}
    </div>
  );
}
