import { useEffect, useId, useRef, useState } from "react";

/**
 * A click-to-open popover showing how a care component looked in a real
 * study. Unlike InfoTooltip (hover/focus, for one sentence), this holds a
 * few sentences plus a source, so it opens on click/tap and stays open
 * until the reader closes it (✕, Esc, or a click outside).
 *
 * On phones it docks to the bottom of the screen as a sheet, so long text
 * doesn't get squeezed next to the row or cover the strip being compared.
 */
export function ExamplePopover({
  buttonLabel,
  heading,
  text,
  source,
  closeLabel,
}: {
  buttonLabel: string;
  heading: string;
  text: string;
  source?: string | undefined;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${open ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
      >
        {buttonLabel}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={heading}
          className="fixed inset-x-0 bottom-0 z-30 rounded-t-xl border border-border bg-card p-4 text-sm shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-96 sm:rounded-md"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {heading}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="-m-1 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 leading-relaxed">{text}</p>
          {source ? <p className="mt-2 text-xs text-muted-foreground">{source}</p> : null}
        </div>
      )}
    </span>
  );
}
