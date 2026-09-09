/** Tooltip label: hover/focus text plus a screen-reader friendly explanation. */
export function Info({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        title={hint}
        aria-label={`${label}: ${hint}`}
        className="flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-border text-[9px] font-bold text-muted-foreground"
      >
        i
      </button>
    </span>
  );
}
