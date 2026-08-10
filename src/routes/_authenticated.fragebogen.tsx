import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { saveAssessment } from "@/lib/data";
import { Choice, MultiChoice, YesNoField } from "@/components/fields";
import { useLang, ui, type L } from "@/lib/i18n";
import {
  FUNCTION_OPTIONS,
  PHQ9_FUNCTION_ITEM,
  PHQ9_INTRO,
  PHQ9_ITEMS,
  PHQ9_OPTIONS,
  phq9Total,
} from "@/lib/phq9";
import { assessRisk, RISK_MESSAGE, RISK_TITLE } from "@/lib/safety";
import {
  PREFERENCES,
  PRIOR_TREATMENTS,
  useSession,
  type AgeBand,
  type Duration,
} from "@/lib/session";

export const Route = createFileRoute("/_authenticated/fragebogen")({
  head: () => ({
    meta: [
      { title: "Fragebogen – Depressions-Kompass" },
      {
        name: "description",
        content:
          "PHQ-9 und kurze Angaben zu Ihrer Situation. Mit Sicherheitsprüfung und anschließender patientenindividueller Vorhersage.",
      },
      { property: "og:title", content: "Fragebogen – Depressions-Kompass" },
      {
        property: "og:description",
        content: "PHQ-9, Beschwerdedauer, Lebenssituation und Behandlungsvorlieben in wenigen Minuten.",
      },
    ],
  }),
  component: Questionnaire,
});

const AGE_OPTIONS: { value: AgeBand; label: L }[] = [
  { value: "18-29", label: ["18–29 Jahre", "18–29 years"] },
  { value: "30-49", label: ["30–49 Jahre", "30–49 years"] },
  { value: "50-64", label: ["50–64 Jahre", "50–64 years"] },
  { value: "65+", label: ["65 Jahre und älter", "65 years and older"] },
];

const DURATION_OPTIONS: { value: Duration; label: L }[] = [
  { value: "lt3m", label: ["Weniger als 3 Monate", "Less than 3 months"] },
  { value: "3to12m", label: ["3 bis 12 Monate", "3 to 12 months"] },
  { value: "gt12m", label: ["Länger als 12 Monate", "Longer than 12 months"] },
];

function Questionnaire() {
  const { tr } = useLang();
  const navigate = useNavigate();
  const { session, setPhq, update, updateProfile, updateSafety } = useSession();
  const [index, setIndex] = useState(0);

  const item9 = session.phq[8] ?? 0;
  const needsSafety = item9 >= 1;
  const risk = assessRisk(session);

  const stepKeys = useMemo(() => {
    const base = ["phqA", "phqB", "phqC", "function"];
    if (needsSafety) base.push("safety");
    return [...base, "basics", "context", "preferences"];
  }, [needsSafety]);

  const key = stepKeys[Math.min(index, stepKeys.length - 1)];
  const total = stepKeys.length;

  const answered = (from: number, to: number) =>
    session.phq.slice(from, to).every((v) => v !== null);

  const canContinue = (() => {
    switch (key) {
      case "phqA":
        return answered(0, 3);
      case "phqB":
        return answered(3, 6);
      case "phqC":
        return answered(6, 9);
      case "function":
        return session.functioning !== null;
      case "safety":
        return (
          session.safety.plan !== null &&
          session.safety.canStaySafe !== null &&
          session.safety.pastAttempt !== null
        );
      case "basics":
        return (
          session.profile.ageBand !== null &&
          session.profile.duration !== null &&
          session.profile.priorEpisodes !== null &&
          session.profile.priorTreatment.length > 0
        );
      case "context":
        return (
          session.profile.chronicIllness !== null &&
          session.profile.livingAlone !== null &&
          session.profile.lowSupport !== null &&
          session.profile.workStrain !== null &&
          session.profile.substanceUse !== null &&
          session.profile.mobilityLimited !== null
        );
      case "preferences":
        return session.profile.preferences.length > 0;
      default:
        return false;
    }
  })();

  const isLast = index === total - 1;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const goNext = async () => {
    if (isLast) {
      setSaving(true);
      setSaveError(null);
      try {
        const completedAt = new Date().toISOString();
        update({ completedAt });
        await saveAssessment({ ...session, completedAt });
        navigate({ to: "/ergebnis" });
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
      return;
    }
    setIndex((i) => i + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };


  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const phqBlock = (from: number, to: number) => (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">{tr(PHQ9_INTRO)}</p>
      {PHQ9_ITEMS.slice(from, to).map((item, i) => {
        const idx = from + i;
        return (
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
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>
            {tr(ui.step)} {index + 1} {tr(ui.of)} {total}
          </span>
          <Link to="/soforthilfe" className="text-destructive">
            {tr(ui.crisis)}
          </Link>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {key === "phqA" && phqBlock(0, 3)}
      {key === "phqB" && phqBlock(3, 6)}
      {key === "phqC" && (
        <div className="space-y-6">
          {phqBlock(6, 9)}
          {item9 >= 1 && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive-soft p-5">
              <h2 className="font-display text-base font-semibold text-destructive">
                {tr(RISK_TITLE[item9 >= 2 ? "elevated" : "low"])}
              </h2>
              <p className="mt-2 text-sm leading-relaxed">
                {tr(RISK_MESSAGE[item9 >= 2 ? "elevated" : "low"])}
              </p>
              <Link to="/soforthilfe" className="mt-3 inline-flex text-sm font-semibold text-destructive underline">
                {tr(["Krisenkontakte anzeigen", "Show crisis contacts"])}
              </Link>
            </div>
          )}
        </div>
      )}

      {key === "function" && (
        <fieldset className="surface-card p-5">
          <legend className="mb-3 block text-base font-semibold">{tr(PHQ9_FUNCTION_ITEM)}</legend>
          <Choice
            name="functioning"
            options={FUNCTION_OPTIONS}
            value={session.functioning as 0 | 1 | 2 | 3 | null}
            onChange={(v) => update({ functioning: v })}
          />
        </fieldset>
      )}

      {key === "safety" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-destructive/40 bg-destructive-soft p-5">
            <h2 className="font-display text-base font-semibold text-destructive">
              {tr(["Kurze Sicherheitsfragen", "A few safety questions"])}
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              {tr([
                "Diese Fragen helfen einzuschätzen, wie schnell Sie Unterstützung brauchen. Antworten Sie so offen, wie es Ihnen möglich ist.",
                "These questions help judge how quickly you need support. Please answer as openly as you can.",
              ])}
            </p>
          </div>
          <YesNoField
            label={[
              "Haben Sie konkrete Pläne oder Vorbereitungen getroffen, sich das Leben zu nehmen oder sich zu verletzen?",
              "Have you made concrete plans or preparations to end your life or to hurt yourself?",
            ]}
            value={session.safety.plan}
            onChange={(v) => updateSafety({ plan: v })}
          />
          <YesNoField
            label={[
              "Trauen Sie sich zu, sich bis zum nächsten Kontakt mit Ihrer Praxis nicht zu schaden?",
              "Do you feel able to keep yourself safe until your next contact with the practice?",
            ]}
            value={session.safety.canStaySafe}
            onChange={(v) => updateSafety({ canStaySafe: v })}
          />
          <YesNoField
            label={[
              "Haben Sie sich in den letzten 12 Monaten selbst verletzt oder einen Suizidversuch unternommen?",
              "In the past 12 months, have you harmed yourself or attempted suicide?",
            ]}
            value={session.safety.pastAttempt}
            onChange={(v) => updateSafety({ pastAttempt: v })}
          />
          {(risk === "acute" || risk === "elevated") && (
            <div className="rounded-2xl border border-destructive bg-destructive-soft p-5">
              <h3 className="font-display text-base font-semibold text-destructive">
                {tr(RISK_TITLE[risk])}
              </h3>
              <p className="mt-2 text-sm leading-relaxed">{tr(RISK_MESSAGE[risk])}</p>
              <Link
                to="/soforthilfe"
                className="mt-3 inline-flex rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
              >
                {tr(["Jetzt Hilfe finden", "Find help now"])}
              </Link>
            </div>
          )}
        </div>
      )}

      {key === "basics" && (
        <div className="space-y-6">
          <fieldset className="surface-card p-5">
            <legend className="mb-3 block text-base font-semibold">
              {tr(["Wie alt sind Sie?", "How old are you?"])}
            </legend>
            <Choice
              name="age"
              columns={2}
              options={AGE_OPTIONS}
              value={session.profile.ageBand}
              onChange={(v) => updateProfile({ ageBand: v })}
            />
          </fieldset>
          <fieldset className="surface-card p-5">
            <legend className="mb-3 block text-base font-semibold">
              {tr([
                "Wie lange bestehen die Beschwerden schon?",
                "How long have the symptoms been present?",
              ])}
            </legend>
            <Choice
              name="duration"
              options={DURATION_OPTIONS}
              value={session.profile.duration}
              onChange={(v) => updateProfile({ duration: v })}
            />
          </fieldset>
          <YesNoField
            label={[
              "Hatten Sie früher schon einmal eine depressive Phase?",
              "Have you had a depressive episode before?",
            ]}
            value={session.profile.priorEpisodes}
            onChange={(v) => updateProfile({ priorEpisodes: v })}
          />
          <fieldset className="surface-card p-5">
            <legend className="mb-3 block text-base font-semibold">
              {tr([
                "Welche Behandlungen haben Sie bereits erhalten?",
                "Which treatments have you already had?",
              ])}
            </legend>
            <MultiChoice
              options={PRIOR_TREATMENTS}
              values={session.profile.priorTreatment}
              onToggle={(id) =>
                updateProfile({
                  priorTreatment:
                    id === "none"
                      ? session.profile.priorTreatment.includes("none")
                        ? []
                        : ["none"]
                      : toggle(
                          session.profile.priorTreatment.filter((x) => x !== "none"),
                          id,
                        ),
                })
              }
            />
          </fieldset>
        </div>
      )}

      {key === "context" && (
        <div className="space-y-3">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {tr([
              "Diese Angaben beeinflussen, welche Versorgungsbausteine erfahrungsgemäß besonders gut wirken.",
              "These answers influence which care components tend to work particularly well.",
            ])}
          </p>
          <YesNoField
            label={[
              "Haben Sie eine dauerhafte körperliche Erkrankung (z. B. Diabetes, Herz, Schmerzen)?",
              "Do you have a long-term physical illness (e.g. diabetes, heart condition, pain)?",
            ]}
            value={session.profile.chronicIllness}
            onChange={(v) => updateProfile({ chronicIllness: v })}
          />
          <YesNoField
            label={["Leben Sie allein?", "Do you live alone?"]}
            value={session.profile.livingAlone}
            onChange={(v) => updateProfile({ livingAlone: v })}
          />
          <YesNoField
            label={[
              "Fehlt Ihnen jemand, mit dem Sie über Belastungen sprechen können?",
              "Do you lack someone you can talk to about your worries?",
            ]}
            value={session.profile.lowSupport}
            onChange={(v) => updateProfile({ lowSupport: v })}
          />
          <YesNoField
            label={[
              "Belasten Sie derzeit Arbeit, Geld oder Wohnsituation stark?",
              "Are work, money or housing a major burden at the moment?",
            ]}
            value={session.profile.workStrain}
            onChange={(v) => updateProfile({ workStrain: v })}
          />
          <YesNoField
            label={[
              "Trinken Sie Alkohol oder nehmen Sie Substanzen, um die Stimmung zu bewältigen?",
              "Do you use alcohol or other substances to cope with your mood?",
            ]}
            value={session.profile.substanceUse}
            onChange={(v) => updateProfile({ substanceUse: v })}
          />
          <YesNoField
            label={[
              "Ist Ihre Beweglichkeit eingeschränkt (Schmerzen, Gehhilfe, Belastungsgrenzen)?",
              "Is your mobility limited (pain, walking aid, limited exertion)?",
            ]}
            value={session.profile.mobilityLimited}
            onChange={(v) => updateProfile({ mobilityLimited: v })}
          />
        </div>
      )}

      {key === "preferences" && (
        <fieldset className="surface-card p-5">
          <legend className="mb-1 block text-base font-semibold">
            {tr([
              "Was können Sie sich für sich selbst am ehesten vorstellen?",
              "What could you most imagine for yourself?",
            ])}
          </legend>
          <p className="mb-4 text-sm text-muted-foreground">
            {tr(["Mehrfachauswahl möglich.", "You can select more than one."])}
          </p>
          <MultiChoice
            options={PREFERENCES}
            values={session.profile.preferences}
            onToggle={(id) => updateProfile({ preferences: toggle(session.profile.preferences, id) })}
          />
        </fieldset>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-40"
        >
          {tr(ui.back)}
        </button>
        <div className="flex items-center gap-3">
          {saveError && <span className="text-xs text-destructive">{saveError}</span>}
          {!canContinue && (
            <span className="text-xs text-muted-foreground">
              {tr(["Bitte alle Fragen beantworten", "Please answer all questions"])}
            </span>
          )}
          <button
            type="button"
            onClick={() => void goNext()}
            disabled={!canContinue || saving}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40"
          >
            {saving
              ? tr(["Wird gespeichert …", "Saving …"])
              : isLast
                ? tr(ui.finish)
                : tr(ui.continue)}
          </button>
        </div>

      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {tr([
          `Aktueller PHQ-9 Zwischenstand: ${phq9Total(session.phq)} von 27 Punkten.`,
          `Current PHQ-9 running total: ${phq9Total(session.phq)} of 27 points.`,
        ])}
      </p>
    </div>
  );
}
