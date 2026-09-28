import { createFileRoute, Link } from "@tanstack/react-router";
import { CrisisNote } from "@/components/CrisisNote";
import { HomeIllustration } from "@/components/HomeIllustration";
import {
  ArrowIcon,
  ChairIcon,
  ChartIcon,
  ChatIcon,
  ClipboardIcon,
  ClockIcon,
  DatabaseIcon,
  PeopleIcon,
  ShieldIcon,
} from "@/components/icons";
import { IconTile } from "@/components/PageHero";
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

/** One tone + icon pair per "How this works" step. */
const STEP_STYLES = [
  { tone: "green", Icon: ClipboardIcon, Meta: ClockIcon },
  { tone: "sky", Icon: ChartIcon, Meta: DatabaseIcon },
  { tone: "amber", Icon: ChatIcon, Meta: ShieldIcon },
] as const;

function Index() {
  const { tr } = useLang();
  const { update } = useSession();
  const e = home.entries;

  return (
    <div>
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
                  <IconTile tone={tone}>
                    <StepIcon className="h-6 w-6" />
                  </IconTile>
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
            <div className="panel flex flex-col p-6">
              <IconTile tone="green">
                <PeopleIcon className="h-6 w-6" />
              </IconTile>
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

            <div className="panel flex flex-col p-6">
              <IconTile tone="lilac">
                <ChairIcon className="h-6 w-6" />
              </IconTile>
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

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <CrisisNote />
      </section>
    </div>
  );
}
