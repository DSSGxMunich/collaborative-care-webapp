import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { computeUnlockCode, normalizeUnlockCode } from "@/lib/unlockCode";
import wartezimmerContent from "@/content/wartezimmer.json";

const w = wartezimmerContent;

/**
 * The waiting-room results gate. Shown on /warten right after the
 * questionnaire, and also on /ergebnis and /praxis if someone navigates
 * there directly (e.g. via the nav bar) before a GP has unlocked results —
 * see the mode/unlocked check in each of those routes. Unlocking requires
 * typing back the code shown here, rather than a single tap, so it's the
 * GP (who the patient hands the code to) taking the action, not the patient
 * absent-mindedly clicking through.
 */
export function WaitingBlocker({ onContinue }: { onContinue?: () => void }) {
  const { tr } = useLang();
  const { session, update } = useSession();
  const [input, setInput] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const code = computeUnlockCode(session);

  const tryUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (normalizeUnlockCode(input) === code) {
      update({ unlocked: true });
      onContinue?.();
    } else {
      setMismatch(true);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{tr(w.blocked.title)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(w.blocked.body)}</p>

      <div className="mt-6 rounded-md border border-border bg-secondary p-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tr(w.blocked.codeLabel)}
        </p>
        <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.3em]">{code}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {tr(w.blocked.codeHint)}
        </p>
      </div>

      <form onSubmit={tryUnlock} className="mt-8 border-t border-border pt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tr(w.blocked.gpLabel)}
        </p>
        <label htmlFor="unlock-code" className="mt-2 block text-sm">
          {tr(w.blocked.gpPrompt)}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="unlock-code"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setMismatch(false);
            }}
            placeholder={tr(w.blocked.codePlaceholder)}
            autoComplete="off"
            maxLength={8}
            className="w-32 rounded-md border border-input bg-background px-2.5 py-2 text-sm font-mono uppercase tracking-widest outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {tr(w.blocked.unlockButton)}
          </button>
        </div>
        {mismatch && <p className="mt-2 text-xs text-destructive">{tr(w.blocked.codeMismatch)}</p>}
      </form>

      <div className="mt-8 space-y-2.5">
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
