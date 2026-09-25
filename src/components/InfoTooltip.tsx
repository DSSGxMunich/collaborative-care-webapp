import { useId, useState, type ReactNode } from "react";

/**
 * A trigger that reveals a fuller explanation on hover/focus, so longer
 * caveats don't have to sit in the page as a standalone sentence people can
 * skim past. Opens on hover *and* keyboard focus (not just :hover) so it's
 * reachable without a mouse.
 *
 * The trigger itself is `children` — text (e.g. a column header that IS the
 * hint) or an icon (e.g. a "?" badge next to a label that stays plain,
 * static text). An icon-only trigger has no visible accessible name of its
 * own, so pass `ariaLabel` for it; a text trigger's own content already
 * serves as its accessible name and doesn't need one.
 *
 * `align` controls which edge of the trigger the popover hangs from:
 * "start" (left-0) for a trigger with open space to its right, and "end"
 * (right-0) for one sitting at the right edge of its row, so the popover
 * doesn't run off the layout.
 */
export function InfoTooltip({
  children,
  description,
  ariaLabel,
  align = "start",
  triggerClassName = "cursor-help whitespace-nowrap border-b border-dotted border-muted-foreground/60 text-xs font-medium text-muted-foreground",
  panelClassName = "w-56",
}: {
  children: ReactNode;
  description: ReactNode;
  ariaLabel?: string;
  align?: "start" | "end";
  triggerClassName?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={triggerClassName}
        aria-label={ariaLabel}
        aria-describedby={tooltipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`absolute top-full z-10 mt-1.5 rounded-md border border-border bg-card p-2.5 text-xs leading-relaxed text-foreground shadow-md ${align === "end" ? "right-0" : "left-0"} ${panelClassName}`}
        >
          {description}
        </span>
      )}
    </span>
  );
}
