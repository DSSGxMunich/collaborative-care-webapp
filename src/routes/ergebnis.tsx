import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { fill, ui, useLang } from "@/lib/i18n";
import { SEVERITY_LABEL, SEVERITY_RANGE } from "@/lib/phq9";
import {
  MODEL_META,
  posteriorEndpointDraws,
  type Range,
  type Scenario,
  type ScenarioId,
} from "@/lib/model";
import { usePrediction } from "@/lib/usePrediction";
import { PRIOR_TREATMENTS } from "@/lib/session";
import resultsContent from "@/content/results.json";

export const Route = createFileRoute("/ergebnis")({
  head: () => ({
    meta: [
      { title: "Ihre Auswertung – Depressions-Kompass" },
      { name: "description", content: resultsContent.title.de },
    ],
  }),
  component: Results,
});

const r = resultsContent;

const pct = (x: number) => `${Math.round(x * 100)}%`;
const rangePct = (rg: Range) => `${Math.round(rg[0] * 100)}–${Math.round(rg[1] * 100)}%`;

/** Bins posterior draws into a small histogram for the chart below. */
function histogram(draws: number[], binCount = 14) {
  const min = 0;
  const max = 27;
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));
  for (const d of draws) {
    const i = Math.min(binCount - 1, Math.max(0, Math.floor((d - min) / width)));
    const bin = bins[i];
    if (bin) bin.count += 1;
  }
  return bins.map((b) => ({ label: `${b.x0.toFixed(0)}`, count: b.count }));
}

function PosteriorChart({ scenario }: { scenario: Scenario }) {
  const draws = useMemo(() => posteriorEndpointDraws(scenario), [scenario]);
  const data = useMemo(() => histogram(draws), [draws]);

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis hide />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
          <ReferenceLine
            x={String(Math.round(scenario.expectedEndpoint))}
            stroke="var(--color-destructive)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Info({ label, hint }: { label: string; hint: string }) {
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

function OutcomeCard({
  id,
  scenario,
  rank,
  total,
}: {
  id: ScenarioId;
  scenario: Scenario;
  rank: number;
  total: number;
}) {
  const { tr } = useLang();
  const [showPosterior, setShowPosterior] = useState(false);
  const s = r.scenarios[id];

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold">{tr(s.label)}</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            {tr(s.badge)}
          </span>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-foreground">
            {tr(r.rankLabel)} {rank} {tr(r.rankOf)} {total}
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(s.description)}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">
            <Info label={tr(r.measures.endpoint.short)} hint={tr(r.measures.endpoint.hint)} />
          </dt>
          <dd className="font-display text-xl font-semibold">{scenario.expectedEndpoint}</dd>
          <dd className="text-xs text-muted-foreground">
            {tr(r.ciLabel)} {scenario.endpointRange[0]}–{scenario.endpointRange[1]}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <Info label={tr(r.measures.response.short)} hint={tr(r.measures.response.hint)} />
          </dt>
          <dd className="font-display text-xl font-semibold">
            {pct(scenario.responseProbability)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {tr(r.ciLabel)} {rangePct(scenario.responseRange)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <Info label={tr(r.measures.remission.short)} hint={tr(r.measures.remission.hint)} />
          </dt>
          <dd className="font-display text-xl font-semibold">
            {pct(scenario.remissionProbability)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {tr(r.ciLabel)} {rangePct(scenario.remissionRange)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => setShowPosterior((v) => !v)}
        className="mt-4 text-xs font-semibold text-primary underline underline-offset-2"
      >
        {tr(showPosterior ? r.posterior.hide : r.posterior.show)}
      </button>
      {showPosterior && (
        <div className="mt-3 rounded-xl bg-secondary/60 p-3">
          <p className="text-xs text-muted-foreground">{tr(r.posterior.explain)}</p>
          <div className="mt-2">
            <PosteriorChart scenario={scenario} />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {tr(r.posterior.placeholderNote)}
          </p>
        </div>
      )}
    </div>
  );
}

function CrisisBanner({ level }: { level: keyof typeof r.crisis }) {
  const { tr } = useLang();
  if (level === "none") return null;
  const c = r.crisis[level];
  return (
    <div className="mt-6 rounded-2xl border border-destructive bg-destructive-soft p-5">
      <h2 className="font-display text-base font-semibold text-destructive">{tr(c.title)}</h2>
      <p className="mt-2 text-sm leading-relaxed">{tr(c.message)}</p>
      <Link
        to="/soforthilfe"
        className="mt-3 inline-flex rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
      >
        {tr(ui.nav.crisis)}
      </Link>
    </div>
  );
}

function Results() {
  const { tr } = useLang();
  const p = usePrediction();
  const [revealed, setRevealed] = useState(false);

  if (!p.hydrated) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  if (!p.complete) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="surface-card p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">{tr(r.title)}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{tr(ui.noData)}</p>
          <Link
            to="/fragebogen"
            className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            {tr(ui.buttons.start)}
          </Link>
        </div>
      </div>
    );
  }

  if (!revealed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl font-semibold">{tr(r.thankYou.title)}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(r.thankYou.body)}</p>

        <CrisisBanner level={p.crisis} />

        <div className="surface-card mt-6 space-y-3 p-6">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
          >
            {tr(r.thankYou.seeResults)}
          </button>
          <Link
            to="/angebote"
            className="block w-full rounded-xl border border-border bg-card px-6 py-3 text-center text-sm font-semibold transition-colors hover:bg-secondary"
          >
            {tr(r.thankYou.seeSupport)}
          </Link>
          <p className="text-xs text-muted-foreground">{tr(r.thankYou.privacyNote)}</p>
        </div>
      </div>
    );
  }

  const chosenTreatments = PRIOR_TREATMENTS.filter((x) =>
    p.session.profile.priorTreatment.includes(x.id),
  );
  const rankById = new Map(p.ranked.map((x) => [x.id, x.rank]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">{tr(r.title)}</h1>

      <div className="mt-4 rounded-2xl border border-warning/50 bg-accent-soft p-4">
        <p className="text-sm leading-relaxed">{tr(r.prototypeNote)}</p>
      </div>

      <CrisisBanner level={p.crisis} />

      <section className="surface-card mt-6 flex flex-wrap items-center gap-6 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {r.phq9Label}
          </p>
          <p className="font-display text-5xl font-semibold leading-none">{p.baseline}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tr(r.of27)}</p>
        </div>
        <div className="min-w-[14rem] flex-1">
          <p className="font-display text-lg font-semibold">{tr(SEVERITY_LABEL[p.severity])}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr(r.range)} {SEVERITY_RANGE[p.severity]}
          </p>
        </div>
      </section>

      {/* ---------------- What can be expected ---------------- */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">{tr(r.whatCanBeExpected)}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr(r.whatCanBeExpectedBody)}
        </p>
        <p className="mt-3 rounded-xl bg-secondary p-4 text-xs leading-relaxed text-muted-foreground">
          {tr(r.scenariosIntro)}
        </p>

        <div className="mt-6 grid gap-4">
          {p.scenarios.map((scenario) => (
            <OutcomeCard
              key={scenario.id}
              id={scenario.id}
              scenario={scenario}
              rank={rankById.get(scenario.id) ?? 0}
              total={p.scenarios.length}
            />
          ))}
        </div>
      </section>

      {/* ---------------- What influences the estimates ---------------- */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">{tr(r.whatInfluences)}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {tr(r.predictorsNote)}
        </p>

        <div className="surface-card mt-5 divide-y divide-border text-sm">
          <div className="flex justify-between gap-4 p-4">
            <span className="text-muted-foreground">{tr(r.predictors.baseline.label)}</span>
            <span className="font-medium">{p.baseline}/27</span>
          </div>
          <div className="flex justify-between gap-4 p-4">
            <span className="text-muted-foreground">{tr(r.predictors.age.label)}</span>
            <span className="font-medium">
              {p.session.profile.ageBand ?? tr(r.predictors.notProvided)}
            </span>
          </div>
          <div className="flex justify-between gap-4 p-4">
            <span className="text-muted-foreground">{tr(r.predictors.sex.label)}</span>
            <span className="font-medium">
              {p.session.profile.sex ?? tr(r.predictors.notProvided)}
            </span>
          </div>
        </div>

        <div className="surface-card mt-4 p-5">
          <h3 className="font-display text-base font-semibold">{tr(r.context)}</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{tr(r.priorTreatmentLabel)}</dt>
              <dd className="text-right font-medium">
                {chosenTreatments.length > 0
                  ? chosenTreatments.map((t) => tr(t.label)).join(", ")
                  : tr(r.predictors.notProvided)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{tr(r.gad7Label)}</dt>
              <dd className="text-right font-medium">
                {p.session.profile.gad7Known === "yes" && p.session.profile.gad7Score !== null
                  ? `${p.session.profile.gad7Score}/21`
                  : tr(r.predictors.notProvided)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/praxis"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          {tr(r.actions.clinicianSummary)}
        </Link>
        <Link
          to="/angebote"
          className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-secondary"
        >
          {tr(r.actions.localSupport)}
        </Link>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        {fill(tr(r.footer), { version: MODEL_META.version })}
      </p>
    </div>
  );
}
