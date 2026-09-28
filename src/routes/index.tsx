import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { HomeIllustration } from "@/components/HomeIllustration";
import { PrototypeCorner } from "@/components/PrototypeCorner";
import { useLang, ui } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import home from "@/content/home.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Versorgungskompass" },
      { name: "description", content: home.body.de },
      { property: "og:title", content: "Versorgungskompass" },
      { property: "og:description", content: home.body.de },
    ],
  }),
  component: Index,
});

/* ---------- Small line icons (24×24, stroke = currentColor) ---------- */

function Icon({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const ClipboardIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V3h6v1" />
    <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
  </Icon>
);
const ChartIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <rect x="4" y="12" width="4" height="8" rx="1" />
    <rect x="10" y="8" width="4" height="12" rx="1" />
    <rect x="16" y="4" width="4" height="16" rx="1" />
  </Icon>
);
const ChatIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    <path d="M17 9h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2.5L16 18h-3" />
  </Icon>
);
const ClockIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
const DatabaseIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
    <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </Icon>
);
const ShieldIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);
const PeopleIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20v-1a6 6 0 0 1 12 0v1" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17 14a5 5 0 0 1 4 5v1" />
  </Icon>
);
const ChairIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M7 3h10v9H7z" />
    <path d="M5 12h14v3H5z" />
    <path d="M7 15v6M17 15v6" />
  </Icon>
);
const ArrowIcon = (p: { className?: string }) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

/* ---------- Page ---------- */

/** One colour pair (soft background + strong ink) per "How this works" step. */
const STEP_STYLES = [
  { tone: "bg-illus-green-soft text-illus-green", Icon: ClipboardIcon, Meta: ClockIcon },
  { tone: "bg-illus-sky-soft text-illus-sky", Icon: ChartIcon, Meta: DatabaseIcon },
  { tone: "bg-illus-amber-soft text-illus-amber", Icon: ChatIcon, Meta: ShieldIcon },
] as const;

function Index() {
  const { tr } = useLang();
  const { update } = useSession();
  const e = home.entries;

  return (
    <div className="relative">
      <PrototypeCorner />

      {/* Hero: what this is, in one glance */}
      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-24 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-20 lg:pt-20">
          <div>
            <h1 className="text-balance-tight text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              {tr(home.title)}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {tr(home.body)}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#start"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                {tr(home.heroCta)}
                <ArrowIcon className="h-4 w-4" />
              </a>
              <Link
                to="/methodology"
                className="inline-flex items-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                {tr(home.heroSecondary)}
              </Link>
            </div>
          </div>
          <HomeIllustration className="mx-auto w-full max-w-md lg:max-w-none" />
        </div>
      </section>

      {/* How this works: three numbered steps */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{tr(home.about.heading)}</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {home.about.items.map((item, i) => {
            const { tone, Icon: StepIcon, Meta } = STEP_STYLES[i % STEP_STYLES.length]!;
            return (
              <li key={i} className="flex gap-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-semibold"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div>
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
                  >
                    <StepIcon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-3 text-lg font-semibold leading-snug">{tr(item.title)}</h3>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Meta className="h-4 w-4 shrink-0" />
                    {tr(item.meta)}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {tr(item.body)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Get started: two ways in */}
      <section id="start" className="scroll-mt-6 border-t border-border bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{tr(e.heading)}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{tr(e.intro)}</p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-illus-green-soft text-illus-green">
                <PeopleIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{tr(e.together.title)}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tr(e.together.body)}
              </p>
              <Link
                to="/fragebogen"
                onClick={() => update({ mode: "clinic", unlocked: false })}
                className="mt-5 inline-flex items-center justify-center gap-2 self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                {tr(e.together.cta)}
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-illus-lilac-soft text-illus-lilac">
                <ChairIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{tr(e.waitingRoom.title)}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {tr(e.waitingRoom.body)}
              </p>
              <Link
                to="/wartezimmer"
                className="mt-5 inline-flex items-center justify-center gap-2 self-start rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                {tr(e.waitingRoom.cta)}
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldIcon className="h-4 w-4 shrink-0" />
            {tr(ui.noAnswersLeaveDevice)}
          </p>
        </div>
      </section>

      {/* Crisis */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive-soft p-6">
          <h2 className="text-base font-semibold text-destructive">{tr(home.crisisTitle)}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{tr(home.crisisBody)}</p>
          <Link
            to="/soforthilfe"
            className="mt-3 inline-flex text-sm font-medium text-destructive underline underline-offset-2"
          >
            {tr(home.crisisLink)}
          </Link>
        </div>
      </section>
    </div>
  );
}
