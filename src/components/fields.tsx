import { useLang, type L } from "@/lib/i18n";

export function Choice<T extends string | number>({
  options,
  value,
  onChange,
  name,
  columns = 1,
}: {
  options: { value: T; label: L; hint?: L }[];
  value: T | null;
  onChange: (v: T) => void;
  name: string;
  columns?: 1 | 2;
}) {
  const { tr } = useLang();
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={columns === 2 ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"}
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={[
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
              selected
                ? "border-primary bg-primary-soft font-semibold text-foreground shadow-soft"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary",
            ].join(" ")}
          >
            <span>{tr(o.label)}</span>
            {o.hint ? (
              <span className="shrink-0 text-xs text-muted-foreground">{tr(o.hint)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function MultiChoice({
  options,
  values,
  onToggle,
}: {
  options: { id: string; label: L }[];
  values: string[];
  onToggle: (id: string) => void;
}) {
  const { tr } = useLang();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const selected = values.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => onToggle(o.id)}
            className={[
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
              selected
                ? "border-primary bg-primary-soft font-semibold shadow-soft"
                : "border-border bg-card hover:border-primary/50 hover:bg-secondary",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
              ].join(" ")}
            >
              {selected ? "✓" : ""}
            </span>
            {tr(o.label)}
          </button>
        );
      })}
    </div>
  );
}

export function YesNoField({
  label,
  value,
  onChange,
}: {
  label: L;
  value: "yes" | "no" | null;
  onChange: (v: "yes" | "no") => void;
}) {
  const { tr } = useLang();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="max-w-md text-sm">{tr(label)}</span>
      <div className="flex gap-2">
        {[
          { v: "yes" as const, l: ["Ja", "Yes"] as L },
          { v: "no" as const, l: ["Nein", "No"] as L },
        ].map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onChange(o.v)}
            className={[
              "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors",
              value === o.v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-secondary",
            ].join(" ")}
          >
            {tr(o.l)}
          </button>
        ))}
      </div>
    </div>
  );
}
