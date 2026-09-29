import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { LanguageProvider, useLang, ui } from "../lib/i18n";
import { SessionProvider } from "../lib/session";
import { CompassMark, FAVICON_HREF } from "../components/CompassMark";
import { PrototypeCorner } from "../components/PrototypeCorner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-semibold text-foreground">404</h1>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Collaborative Care Compass" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // The compass mark, inlined as a data URI: without an explicit icon,
      // browsers fall back to requesting /favicon.ico at the domain root
      // (outside our base path), which can flash a stale/unrelated cached icon.
      { rel: "icon", type: "image/svg+xml", href: FAVICON_HREF },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-2 text-xs">
      {(["de", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={lang === l ? "font-semibold text-foreground" : "text-muted-foreground"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function SiteHeader() {
  const { tr } = useLang();
  const navItems = [
    { to: "/fragebogen" as const, label: ui.nav.questionnaire },
    { to: "/methodology" as const, label: ui.nav.methodology },
    { to: "/ergebnis" as const, label: ui.nav.results },
    { to: "/praxis" as const, label: ui.nav.clinician },
    { to: "/angebote" as const, label: ui.nav.support },
    { to: "/faq" as const, label: ui.nav.faq },
  ];

  return (
    <header className="border-b border-border print:hidden">
      {/* Same column as PageHero/PageBody (max-w-4xl, px-4 sm:px-8), so the
          header's left and right edges line up with the page text below. */}
      <div className="mx-auto max-w-4xl space-y-2 px-4 py-3 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-strong"
          >
            <CompassMark className="h-7 w-7" />
            {tr(ui.appName)}
          </Link>
          <div className="flex shrink-0 items-center gap-4">
            <Link to="/soforthilfe" className="text-sm font-medium text-destructive">
              {tr(ui.nav.crisis)}
            </Link>
            <LanguageToggle />
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-foreground font-medium" }}
              className="whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              {tr(item.label)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  const { tr } = useLang();
  return (
    <footer className="mt-16 border-t border-border print:hidden">
      <div className="mx-auto max-w-3xl px-4 py-6 text-xs leading-relaxed text-muted-foreground">
        <p>{tr(ui.disclaimer)}</p>
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SessionProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            {/* `relative` anchors the "Research prototype" corner flag to the
                top-right of the page content (just below the header). */}
            <main className="relative flex-1">
              <PrototypeCorner />
              {/* Required: nested routes render here. */}
              <Outlet />
            </main>
            <SiteFooter />
          </div>
        </SessionProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
