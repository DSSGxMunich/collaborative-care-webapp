import { useState } from "react";
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

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const pad2 = (n: number) => String(n).padStart(2, "0");
const selectClass =
  "rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-primary";

/**
 * A birth-date picker built from three plain <select> dropdowns instead of a
 * single native `<input type="date">`. The native date input's keyboard entry
 * is unreliable across browsers (typing a date can silently fail to commit a
 * value, unlike opening its calendar dropdown), which blocked users from
 * continuing. Dropdowns are keyboard- and click-friendly and always produce a
 * valid, complete date.
 */
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

  // Selections accumulate here (day, then month, then year — in any order)
  // until all three are picked; only then is a complete date reported
  // upward. Deriving these straight from `value` instead would forget the
  // first two picks whenever the third is still missing, since `value` only
  // ever holds a *complete* date (or null while one is still missing).
  const [[year, month, day], setParts] = useState<[number | null, number | null, number | null]>(
    () => (value ? (value.split("-").map(Number) as [number, number, number]) : [null, null, null]),
  );

  const maxYear = max ? Number(max.slice(0, 4)) : new Date().getFullYear();
  const minYear = min ? Number(min.slice(0, 4)) : maxYear - 110;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
  const dayCount = year && month ? daysInMonth(year, month) : 31;

  const commit = (y: number | null, m: number | null, d: number | null) => {
    setParts([y, m, d]);
    if (y === null || m === null || d === null) {
      onChange(null);
      return;
    }
    const clampedDay = Math.min(d, daysInMonth(y, m));
    let iso = `${y}-${pad2(m)}-${pad2(clampedDay)}`;
    if (min && iso < min) iso = min;
    if (max && iso > max) iso = max;
    onChange(iso);
  };

  return (
    <fieldset className="surface-card p-5">
      <legend className="mb-3 block text-base font-semibold">{tr(label)}</legend>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label={tr(ui.dateField.day)}
          value={day ?? ""}
          onChange={(e) => commit(year, month, e.target.value ? Number(e.target.value) : null)}
          className={selectClass}
        >
          <option value="">{tr(ui.dateField.day)}</option>
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {pad2(d)}
            </option>
          ))}
        </select>
        <select
          aria-label={tr(ui.dateField.month)}
          value={month ?? ""}
          onChange={(e) => {
            const m = e.target.value ? Number(e.target.value) : null;
            commit(year, m, m && year ? Math.min(day ?? 1, daysInMonth(year, m)) : day);
          }}
          className={selectClass}
        >
          <option value="">{tr(ui.dateField.month)}</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {pad2(m)}
            </option>
          ))}
        </select>
        <select
          aria-label={tr(ui.dateField.year)}
          value={year ?? ""}
          onChange={(e) => commit(e.target.value ? Number(e.target.value) : null, month, day)}
          className={selectClass}
        >
          <option value="">{tr(ui.dateField.year)}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{tr(error)}</p> : null}
    </fieldset>
  );
}
