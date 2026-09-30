import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Choice, DateField, MultiChoice, NowBeforeField, YesNoField } from "@/components/fields";
import { ClipboardIcon } from "@/components/icons";
import { PageBody, PageHero } from "@/components/PageHero";
import { ui, useLang } from "@/lib/i18n";
import { PHQ9_INTRO, PHQ9_ITEMS, PHQ9_OPTIONS } from "@/lib/phq9";
import {
  ageFromBirthDate,
  birthDateBounds,
  TREATMENTS,
  treatmentAnswered,
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
        return treatmentAnswered(session.profile.treatment);
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

  // Picking any treatment clears "none"; picking "none" clears every treatment.
  const toggleTreatment = (id: string, when: "current" | "past") => {
    const t = session.profile.treatment;
    const list = t[when];
    updateProfile({
      treatment: {
        ...t,
        none: false,
        [when]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      },
    });
  };
  const toggleNoTreatment = () =>
    updateProfile({ treatment: { current: [], past: [], none: !session.profile.treatment.none } });

  return (
    <>
      <PageHero
        icon={<ClipboardIcon className="h-6 w-6" />}
        title={tr(q.stepTitles[key])}
        {...(key === "safety"
          ? { intro: tr(q.safety.intro) }
          : key === "history"
            ? { intro: tr(q.profile.historyIntro) }
            : {})}
      >
        <p
          key={index}
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {`${tr(ui.nav.questionnaire)} · ${tr(ui.step)} ${index + 1} ${tr(ui.of)} ${total}`}
        </p>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-card"
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
      </PageHero>

      <PageBody>
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
          <fieldset className="surface-card p-5">
            <legend className="mb-1 block text-base font-semibold">
              {tr(q.profile.treatment.question)}
            </legend>
            <p className="mb-4 text-sm text-muted-foreground">{tr(q.profile.treatment.hint)}</p>
            <div className="space-y-2">
              {TREATMENTS.map((t) => (
                <NowBeforeField
                  key={t.id}
                  label={t.label}
                  labels={q.profile.treatment}
                  current={session.profile.treatment.current.includes(t.id)}
                  past={session.profile.treatment.past.includes(t.id)}
                  onToggle={(when) => toggleTreatment(t.id, when)}
                />
              ))}
              <MultiChoice
                options={[{ id: "none", label: q.profile.treatment.none }]}
                values={session.profile.treatment.none ? ["none"] : []}
                onToggle={toggleNoTreatment}
              />
            </div>
          </fieldset>
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
      </PageBody>
    </>
  );
}
