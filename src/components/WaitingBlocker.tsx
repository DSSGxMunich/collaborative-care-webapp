import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import wartezimmerContent from "@/content/wartezimmer.json";

const w = wartezimmerContent;

/**
 * The "please wait for your GP" gate. Shown on /warten right after the
 * questionnaire, and also on /ergebnis and /praxis if someone navigates
 * there directly (e.g. via the nav bar) before the GP has unlocked results —
 * see the mode/unlocked check in each of those routes.
 */
export function WaitingBlocker({ onContinue }: { onContinue?: () => void }) {
  const { tr } = useLang();
  const { update } = useSession();

  const continueWithGp = () => {
    update({ unlocked: true });
    onContinue?.();
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{tr(w.blocked.title)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(w.blocked.body)}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {tr(w.blocked.waitingNote)}
      </p>

      <div className="mt-6 space-y-2.5">
        <button
          type="button"
          onClick={continueWithGp}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          {tr(w.blocked.continueWithGp)}
        </button>
        <p className="text-center text-xs text-muted-foreground">{tr(w.blocked.continueHint)}</p>
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
