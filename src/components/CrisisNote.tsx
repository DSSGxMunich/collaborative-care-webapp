import { Link } from "@tanstack/react-router";
import { AlertIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";
import home from "@/content/home.json";

/** The "If you are in crisis right now" box shown on the landing and waiting-room pages. */
export function CrisisNote() {
  const { tr } = useLang();
  return (
    <div className="flex gap-4 rounded-xl border border-destructive/30 bg-destructive-soft p-6">
      <AlertIcon className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
      <div>
        <h2 className="text-base font-semibold text-destructive">{tr(home.crisisTitle)}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{tr(home.crisisBody)}</p>
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
