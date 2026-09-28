import { Link } from "@tanstack/react-router";
import { LockIcon } from "@/components/icons";
import { EmptyState } from "@/components/PageHero";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { computeUnlockCode } from "@/lib/unlockCode";
import wartezimmerContent from "@/content/wartezimmer.json";

const w = wartezimmerContent;

/**
 * The waiting-room results gate. Shown on /warten right after the
 * questionnaire, and also on /ergebnis if someone navigates there directly
 * before a GP has unlocked results. The code itself is only entered on the
 * "For the practice" page (src/routes/praxis.tsx, via GpUnlockCard) — a GP
 * arriving here is pointed there, rather than this page duplicating the
 * same unlock form.
 */
export function WaitingBlocker() {
  const { tr } = useLang();
  const { session } = useSession();
  const code = computeUnlockCode(session);

  return (
    <EmptyState
      icon={<LockIcon className="h-6 w-6" />}
      title={tr(w.blocked.title)}
      body={tr(w.blocked.body)}
    >
      <div className="rounded-xl bg-brand-soft p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tr(w.blocked.codeLabel)}
        </p>
        <p className="mt-2 font-mono text-4xl font-bold tracking-[0.3em]">{code}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {tr(w.blocked.codeHint)}
        </p>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {tr(w.blocked.unlockInstructions)}
      </p>

      <div className="mt-6 space-y-2.5">
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
    </EmptyState>
  );
}
