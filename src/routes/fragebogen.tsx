import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Choice,
  DateField,
  MultiChoice,
  NumberField,
  Toggle,
  YesNoField,
} from "@/components/fields";
import { GAD7_INTRO, GAD7_ITEMS, GAD7_OPTIONS, gad7Total } from "@/lib/gad7";
import { ui, useLang } from "@/lib/i18n";
import { PHQ9_INTRO, PHQ9_ITEMS, PHQ9_OPTIONS } from "@/lib/phq9";
import {
  ageFromBirthDate,
  birthDateBounds,
  PRIOR_TREATMENTS,
  SEX_OPTIONS,
  useSession,
} from "@/lib/session";
import questionnaireContent from "@/content/questionnaire.json";

export const Route = createFileRoute("/fragebogen")({
  head: () => ({
    meta: [
      { title: "Fragebogen – Depressions-Kompass" },
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
          session.safety.plan !== null &&
          session.safety.canStaySafe !== null &&
          session.safety.pastAttempt !== null &&
          session.safety.familyHistory !== null
        );
      case "history":
        return (
          session.profile.priorEpisode !== null &&
          session.profile.priorTreatment.length > 0 &&
          session.profile.gad7Known !== null &&
          (session.profile.gad7Known === "yes"
            ? session.profile.gad7Score !== null
            : !session.profile.gad7FillNow || gad7Total(session.profile.gad7Answers) !== null)
        );
      default:
        return false;
    }
  }, [key, session, isUnderage]);

  const isLast = index === total - 1;

  const goNext = () => {
    if (isLast) {
      update({ completedAt: new Date().toISOString() });
      navigate({ to: "/ergebnis" });
      return;
    }
    setIndex((i) => i + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setGad7Answer = (idx: number, value: number) => {
    const answers = [...session.profile.gad7Answers];
    answers[idx] = value;
    updateProfile({ gad7Answers: answers });
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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tr(ui.step)} {index + 1} {tr(ui.of)} {total}
        </p>
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-secondary"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {key === "basics" && (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tr(q.profile.sectionIntro)}
          </p>
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
          <p className="text-sm leading-relaxed text-muted-foreground">{tr(q.safety.intro)}</p>
          <YesNoField
            label={q.safety.questions.plan}
            value={session.safety.plan}
            onChange={(v) => updateSafety({ plan: v })}
          />
          <YesNoField
            label={q.safety.questions.canStaySafe}
            value={session.safety.canStaySafe}
            onChange={(v) => updateSafety({ canStaySafe: v })}
          />
          <YesNoField
            label={q.safety.questions.pastAttempt}
            value={session.safety.pastAttempt}
            onChange={(v) => updateSafety({ pastAttempt: v })}
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
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tr(q.profile.historyIntro)}
          </p>
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
          <YesNoField
            label={q.profile.gad7.knownQuestion}
            value={session.profile.gad7Known}
            onChange={(v) =>
              updateProfile({
                gad7Known: v,
                gad7Score: v === "no" ? null : session.profile.gad7Score,
              })
            }
          />
          {session.profile.gad7Known === "yes" && (
            <NumberField
              label={q.profile.gad7.scoreQuestion}
              hint={q.profile.gad7.scoreHint}
              min={0}
              max={21}
              value={session.profile.gad7Score}
              onChange={(v) => updateProfile({ gad7Score: v })}
            />
          )}
          {session.profile.gad7Known === "no" && (
            <div className="surface-card p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{tr(q.profile.gad7.fillNowQuestion)}</span>
                <Toggle
                  label={q.profile.gad7.fillNowQuestion}
                  checked={session.profile.gad7FillNow}
                  onChange={(v) =>
                    updateProfile({
                      gad7FillNow: v,
                      ...(v ? {} : { gad7Answers: Array<number | null>(7).fill(null) }),
                    })
                  }
                />
              </div>
              {session.profile.gad7FillNow && (
                <div className="mt-5 space-y-5">
                  <p className="text-sm text-muted-foreground">{tr(GAD7_INTRO)}</p>
                  {GAD7_ITEMS.map((item, idx) => (
                    <fieldset
                      key={idx}
                      className="border-t border-border pt-4 first:border-t-0 first:pt-0"
                    >
                      <legend className="mb-3 block text-sm font-medium">
                        {idx + 1}. {tr(item)}
                      </legend>
                      <Choice
                        name={`gad7-${idx}`}
                        options={GAD7_OPTIONS}
                        value={session.profile.gad7Answers[idx] as 0 | 1 | 2 | 3 | null}
                        onChange={(v) => setGad7Answer(idx, v)}
                      />
                    </fieldset>
                  ))}
                </div>
              )}
            </div>
          )}
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
  );
}
