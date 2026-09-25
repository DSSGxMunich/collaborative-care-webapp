import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { computeUnlockCode } from "@/lib/unlockCode";
import wartezimmerContent from "@/content/wartezimmer.json";

const w = wartezimmerContent;

/**
 * The waiting-room results gate. Shown on /warten right after the
 * questionnaire, and also on /ergebnis and /praxis if someone navigates
 * there directly (e.g. via the nav bar) before a GP has unlocked results —
 * see the mode/unlocked check in each of those routes. The code itself is
 * only entered on the home page's "For the practice" card (see
 * src/routes/index.tsx) — a GP arriving here is pointed back there, rather
 * than this page duplicating the same unlock form.
 */
export function WaitingBlocker() {
  const { tr } = useLang();
  const { session } = useSession();
  const code = computeUnlockCode(session);

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

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {tr(w.blocked.unlockInstructions)}
      </p>

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
