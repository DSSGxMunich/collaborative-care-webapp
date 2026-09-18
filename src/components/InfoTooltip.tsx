import { useId, useState, type ReactNode } from "react";

/**
 * A short label that reveals a fuller explanation on hover/focus, so
 * longer caveats don't have to sit in the page as a standalone sentence
 * people can skim past. Opens on hover *and* keyboard focus (not just
 * :hover) so it's reachable without a mouse.
 *
 * `align` controls which edge of the trigger the popover hangs from:
 * "start" (left-0) for a trigger with open space to its right — e.g. a
 * label at the start of a line — and "end" (right-0) for a trigger sitting
 * at the right edge of its row, so the popover doesn't run off the layout.
 */
export function InfoTooltip({
  label,
  description,
  align = "start",
  triggerClassName = "cursor-help whitespace-nowrap border-b border-dotted border-muted-foreground/60 text-xs font-medium text-muted-foreground",
  panelClassName = "w-56",
}: {
  label: string;
  description: ReactNode;
  align?: "start" | "end";
  triggerClassName?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className={triggerClassName}
        aria-describedby={tooltipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
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
