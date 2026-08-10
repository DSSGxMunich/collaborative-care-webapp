import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAuth, type Role } from "@/lib/auth";
import { joinPractice } from "@/lib/data";

type Search = { role?: Role | undefined; mode?: "signin" | "signup" | undefined };

export const Route = createFileRoute("/anmelden")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    role: s['role'] === "gp" ? "gp" : s['role'] === "patient" ? "patient" : undefined,
    mode: s['mode'] === "signup" ? "signup" : "signin",
  }),
  head: () => ({
    meta: [
      { title: "Anmelden – Depressions-Kompass" },
      {
        name: "description",
        content:
          "Zugang für Patientinnen, Patienten und Hausarztpraxen: anmelden oder Konto anlegen und Praxis-Code verknüpfen.",
      },
      { property: "og:title", content: "Anmelden – Depressions-Kompass" },
      {
        property: "og:description",
        content: "Konto für den Depressions-Kompass anlegen oder anmelden.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { tr } = useLang();
  const { signIn, signUp, refresh } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const role: Role = search.role ?? "patient";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [practiceCode, setPracticeCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const res = await signUp({
          email,
          password,
          role,
          fullName,
          ...(role === "gp" && practiceName ? { practiceName } : {}),
        });
        if (res.needsConfirmation) {
          setInfo(
            tr([
              "Bitte bestätigen Sie die E-Mail-Adresse über den zugesandten Link und melden sich dann an.",
              "Please confirm your email address via the link we sent, then sign in.",
            ]),
          );
          setBusy(false);
          return;
        }
      } else {
        await signIn(email, password);
      }
      if (role === "patient" && practiceCode.trim()) {
        await joinPractice(practiceCode.trim().toUpperCase());
        await refresh();
      }
      navigate({ to: role === "gp" ? "/praxis" : "/fragebogen" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl font-semibold">
        {mode === "signup"
          ? tr(["Konto anlegen", "Create an account"])
          : tr(["Anmelden", "Sign in"])}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {role === "gp"
          ? tr(["Zugang für Praxen", "Practice access"])
          : tr(["Zugang für Patientinnen und Patienten", "Patient access"])}
      </p>

      <div className="surface-card mt-6 space-y-4 p-6">
        {mode === "signup" && (
          <label className="block text-sm font-semibold">
            {role === "gp" ? tr(["Name (Praxis)", "Your name"]) : tr(["Ihr Name", "Your name"])}
            <input
              className={field}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </label>
        )}
        {mode === "signup" && role === "gp" && (
          <label className="block text-sm font-semibold">
            {tr(["Praxisname", "Practice name"])}
            <input
              className={field}
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
            />
          </label>
        )}
        <label className="block text-sm font-semibold">
          {tr(["E-Mail", "Email"])}
          <input
            type="email"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-semibold">
          {tr(["Passwort", "Password"])}
          <input
            type="password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>
        {role === "patient" && (
          <label className="block text-sm font-semibold">
            {tr(["Praxis-Code (optional)", "Practice code (optional)"])}
            <input
              className={field}
              value={practiceCode}
              onChange={(e) => setPracticeCode(e.target.value)}
              placeholder="ABC123"
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {tr([
                "Mit dem Code Ihrer Praxis werden Ihre Ergebnisse für Ihre Ärztin oder Ihren Arzt sichtbar.",
                "With your practice's code your results become visible to your clinician.",
              ])}
            </span>
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-foreground">{info}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !email || !password}
          className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {busy
            ? tr(["Bitte warten …", "Please wait …"])
            : mode === "signup"
              ? tr(["Konto anlegen", "Create account"])
              : tr(["Anmelden", "Sign in"])}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="w-full text-sm font-semibold text-primary"
        >
          {mode === "signup"
            ? tr(["Ich habe schon ein Konto", "I already have an account"])
            : tr(["Neues Konto anlegen", "Create a new account"])}
        </button>
      </div>
    </div>
  );
}
