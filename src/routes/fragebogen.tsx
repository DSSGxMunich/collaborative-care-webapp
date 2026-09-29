import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Choice, DateField, MultiChoice, YesNoField } from "@/components/fields";
import { ClipboardIcon } from "@/components/icons";
import { IconTile } from "@/components/PageHero";
import { ui, useLang } from "@/lib/i18n";
import { PHQ9_INTRO, PHQ9_ITEMS, PHQ9_OPTIONS } from "@/lib/phq9";
import {
  ageFromBirthDate,
  birthDateBounds,
  PRIOR_TREATMENTS,
  PROBABILITY_OPTIONS,
  SEX_OPTIONS,
  useSession,
} from "@/lib/session";
import questionnaireContent from "@/content/questionnaire.json";

export const Route = createFileRoute("/fragebogen")({
  head: () => ({
    meta: [
      { title: "Fragebogen | Versorgungskompass" },
      { name: "description", content: questionnaireContent.phq9.intro.de },
    ],
  }),
  component: Questionnaire,
});

const q = questionnaireContent;

const STEP_KEYS = ["basics", "phq9", "safety", "history"] as const;
type StepKey = (typeof STEP_KEYS)[number];

function Questionnaire() {
  const { tr } = useLang();
  const navigate = useNavigate();
  const { session, setPhq, update, updateProfile, updateSafety } = useSession();
  const [index, setIndex] = useState(0);
  const dateBounds = useMemo(() => birthDateBounds(), []);

  const key: StepKey = STEP_KEYS[Math.min(index, STEP_KEYS.length - 1)] ?? "basics";
  const total = STEP_KEYS.length;

  const isUnderage = useMemo(() => {
    if (!session.profile.birthDate) return false;
    return ageFromBirthDate(session.profile.birthDate) < 18;
  }, [session.profile.birthDate]);

  const canContinue = useMemo(() => {
    switch (key) {
      case "basics":
        return session.profile.birthDate !== null && session.profile.sex !== null && !isUnderage;
      case "phq9":
        return session.phq.every((v) => v !== null);
      case "safety":
        return (
          session.safety.past !== null &&
          session.safety.plan !== null &&
          session.safety.probability !== null &&
          session.safety.preventive !== null &&
          session.safety.familyHistory !== null
        );
      case "history":
        return session.profile.priorEpisode !== null && session.profile.priorTreatment.length > 0;
      default:
        return false;
    }
  }, [key, session, isUnderage]);

  const isLast = index === total - 1;

  const goNext = () => {
    if (isLast) {
      update({ completedAt: new Date().toISOString() });
      navigate({ to: session.mode === "waitingRoom" ? "/warten" : "/ergebnis" });
      return;
    }
    setIndex((i) => i + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleTreatment = (id: string) => {
    const current = session.profile.priorTreatment;
    if (id === "none") {
      updateProfile({ priorTreatment: current.includes("none") ? [] : ["none"] });
      return;
    }
    const withoutNone = current.filter((x) => x !== "none");
    updateProfile({
      priorTreatment: withoutNone.includes(id)
        ? withoutNone.filter((x) => x !== id)
        : [...withoutNone, id],
    });
  };

  return (
    <>
      <section className="border-b border-border bg-brand-soft">
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-12 sm:px-8">
          <div className="flex items-center gap-3">
            <IconTile>
              <ClipboardIcon className="h-5 w-5" />
            </IconTile>
            <p
              key={index}
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {`${tr(ui.nav.questionnaire)} · ${tr(ui.step)} ${index + 1} ${tr(ui.of)} ${total}`}
            </p>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{tr(q.stepTitles[key])}</h1>
          {key === "safety" && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {tr(q.safety.intro)}
            </p>
          )}
          <div
            className="mt-5 h-2 w-full overflow-hidden rounded-full bg-card"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        {key === "basics" && (
          <div className="space-y-6">
            <DateField
              label={q.profile.age.question}
              min={dateBounds.min}
              max={dateBounds.max}
              value={session.profile.birthDate}
              onChange={(v) => updateProfile({ birthDate: v })}
              {...(isUnderage ? { error: q.profile.age.underageWarning } : {})}
            />
            <fieldset className="surface-card p-5">
              <legend className="mb-3 block text-base font-semibold">
                {tr(q.profile.sex.question)}
              </legend>
              <Choice
                name="sex"
                columns={2}
                options={SEX_OPTIONS}
                value={session.profile.sex}
                onChange={(v) => updateProfile({ sex: v })}
              />
            </fieldset>
          </div>
        )}

        {key === "phq9" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold leading-snug">{tr(PHQ9_INTRO)}</h2>
            {PHQ9_ITEMS.map((item, idx) => (
              <fieldset key={idx} className="surface-card p-5">
                <legend className="mb-3 block text-base font-semibold">
                  {idx + 1}. {tr(item)}
                </legend>
                <Choice
                  name={`phq-${idx}`}
                  options={PHQ9_OPTIONS}
                  value={session.phq[idx] as 0 | 1 | 2 | 3 | null}
                  onChange={(v) => setPhq(idx, v)}
                />
              </fieldset>
            ))}
          </div>
        )}

        {key === "safety" && (
          <div className="space-y-3">
            <YesNoField
              label={q.safety.questions.past}
              value={session.safety.past}
              onChange={(v) => updateSafety({ past: v })}
            />
            <YesNoField
              label={q.safety.questions.plan}
              value={session.safety.plan}
              onChange={(v) => updateSafety({ plan: v })}
            />
            <div className="space-y-2 rounded-md border border-border px-3.5 py-2.5">
              <p className="text-sm">{tr(q.safety.questions.probability)}</p>
              <Choice
                name="safety-probability"
                columns={3}
                options={PROBABILITY_OPTIONS}
                value={session.safety.probability}
                onChange={(v) => updateSafety({ probability: v })}
              />
            </div>
            <YesNoField
              label={q.safety.questions.preventive}
              value={session.safety.preventive}
              onChange={(v) => updateSafety({ preventive: v })}
            />
            <YesNoField
              label={q.safety.questions.familyHistory}
              value={session.safety.familyHistory}
              onChange={(v) => updateSafety({ familyHistory: v })}
            />
          </div>
        )}

        {key === "history" && (
          <div className="space-y-6">
            <YesNoField
              label={q.profile.priorEpisode.question}
              value={session.profile.priorEpisode}
              onChange={(v) => updateProfile({ priorEpisode: v })}
            />
            <fieldset className="surface-card p-5">
              <legend className="mb-1 block text-base font-semibold">
                {tr(q.profile.priorTreatment.question)}
              </legend>
              <p className="mb-4 text-sm text-muted-foreground">
                {tr(q.profile.priorTreatment.hint)}
              </p>
              <MultiChoice
                options={PRIOR_TREATMENTS}
                values={session.profile.priorTreatment}
                onToggle={toggleTreatment}
              />
            </fieldset>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-md border border-border px-3.5 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-40"
          >
            {tr(ui.buttons.back)}
          </button>
          <div className="flex items-center gap-3">
            {!canContinue && (
              <span className="text-xs text-muted-foreground">{tr(q.pleaseAnswerAll)}</span>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {isLast ? tr(ui.buttons.finish) : tr(ui.buttons.continue)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
