import type { ReactNode } from "react";

/** Icon-tile colour pairs (soft background + strong ink), from the --illus-* tokens. */
export const TONES = {
  green: "bg-illus-green-soft text-illus-green",
  sky: "bg-illus-sky-soft text-illus-sky",
  amber: "bg-illus-amber-soft text-illus-amber",
  lilac: "bg-illus-lilac-soft text-illus-lilac",
  destructive: "bg-destructive-soft text-destructive",
} as const;

export type Tone = keyof typeof TONES;

/** A rounded square holding an icon, tinted with one of the TONES. */
export function IconTile({
  tone,
  children,
  size = "md",
}: {
  tone: Tone;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ${TONES[tone]} ${size === "lg" ? "h-12 w-12" : "h-10 w-10"}`}
    >
      {children}
    </span>
  );
}

/**
 * The tinted header band every inner page opens with, matching the landing
 * page hero: icon tile, large bold title, a short intro and optional actions.
 *
 * The icon tile sits above the title on purpose: it keeps the title's line
 * below the triangular "Research prototype" flag in the top-right corner
 * (PrototypeCorner, 7rem tall), so the two never overlap on narrow screens.
 */
export function PageHero({
  icon,
  tone = "green",
  title,
  intro,
  children,
  titleClassName = "",
}: {
  icon: ReactNode;
  tone?: Tone;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  titleClassName?: string;
}) {
  return (
    <section className="border-b border-border bg-hero print:border-none print:bg-transparent">
      <div className="mx-auto max-w-4xl px-4 pb-10 pt-12 sm:px-8 sm:pt-14 print:p-0">
        <div className="flex print:hidden">
          <IconTile tone={tone} size="lg">
            {icon}
          </IconTile>
        </div>
        <h1
          className={`mt-5 text-balance-tight text-3xl font-bold leading-tight tracking-tight sm:text-4xl print:mt-0 print:text-2xl ${titleClassName}`}
        >
          {title}
        </h1>
        {intro && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{intro}</p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}

/**
 * A centred card for "nothing to show yet" / "one step first" states (no
 * questionnaire data, results still locked, …), so those screens look like
 * part of the same site rather than a bare line of text.
 */
export function EmptyState({
  icon,
  tone = "green",
  title,
  body,
  children,
}: {
  icon: ReactNode;
  tone?: Tone;
  title: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="bg-hero px-4 pb-16 pt-24 sm:pt-20">
      <div className="panel mx-auto max-w-xl p-8 text-center">
        <span className="inline-flex">
          <IconTile tone={tone} size="lg">
            {icon}
          </IconTile>
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
        {body && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}

/** Body container for content under a PageHero — same width, so edges line up. */
export function PageBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto max-w-4xl px-4 py-10 sm:px-8 ${className}`}>{children}</div>;
}
