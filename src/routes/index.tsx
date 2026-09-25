import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, ui } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Collaborative Care Compass" }],
  }),
  component: Landing,
});

function Landing() {
  const { tr } = useLang();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-balance-tight text-3xl font-semibold leading-snug sm:text-4xl">
        {tr(ui.appName)}
      </h1>
      <Link
        to="/start"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground"
      >
        {tr(ui.buttons.enter)}
      </Link>
    </div>
  );
}
