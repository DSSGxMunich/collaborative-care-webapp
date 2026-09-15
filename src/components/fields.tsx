import { ui, useLang, type L } from "@/lib/i18n";

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
              "flex items-center justify-between gap-3 rounded-md border px-3.5 py-2.5 text-left text-sm",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-foreground/30",
            ].join(" ")}
          >
            <span>{tr(o.label)}</span>
            {o.hint ? (
              <span
                className={[
                  "shrink-0 text-xs",
                  selected ? "text-primary-foreground/70" : "text-muted-foreground",
                ].join(" ")}
              >
                {tr(o.hint)}
              </span>
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
              "flex items-center gap-3 rounded-md border px-3.5 py-2.5 text-left text-sm",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-foreground/30",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={[
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px]",
                selected ? "border-primary-foreground text-primary-foreground" : "border-input",
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3.5 py-2.5">
      <span className="max-w-md text-sm">{tr(label)}</span>
      <div className="flex gap-1.5">
        {(["yes", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={[
              "rounded-md border px-3 py-1 text-sm",
              value === v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-foreground/30",
            ].join(" ")}
          >
            {tr(v === "yes" ? ui.yes : ui.no)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: L;
}) {
  const { tr } = useLang();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? tr(label) : undefined}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-secondary",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: L;
  hint?: L;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max: number;
}) {
  const { tr } = useLang();
  return (
    <div className="rounded-md border border-border px-3.5 py-2.5">
      <label className="block text-sm">
        {tr(label)}
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(null);
            const n = Math.max(min, Math.min(max, Number(raw)));
            onChange(Number.isNaN(n) ? null : n);
          }}
          className="mt-2 w-20 rounded-md border border-input bg-background px-2.5 py-1 text-sm outline-none focus:border-primary"
        />
      </label>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{tr(hint)}</p> : null}
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  error,
}: {
  label: L;
  value: string | null;
  onChange: (v: string | null) => void;
  min?: string;
  max?: string;
  error?: L;
}) {
  const { tr } = useLang();

  return (
    <fieldset className="surface-card p-5">
      <legend className="mb-3 block text-base font-semibold">{tr(label)}</legend>
      <input
        type="date"
        aria-label={tr(label)}
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
        className="rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-primary"
      />
      {error ? <p className="mt-1.5 text-xs text-destructive">{tr(error)}</p> : null}
    </fieldset>
  );
}
