import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { LanguageProvider, useLang, ui } from "../lib/i18n";
import { SessionProvider } from "../lib/session";

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
      // Explicit no-op icon: without this, browsers fall back to requesting
      // /favicon.ico at the domain root (outside our base path) whenever no
      // <link rel="icon"> is present, which can flash a stale/unrelated
      // cached icon before resolving to nothing.
      { rel: "icon", href: "data:," },
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
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-3">
        <Link to="/start" className="shrink-0 text-sm font-semibold">
          {tr(ui.appName)}
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
        <div className="flex shrink-0 items-center gap-4">
          <Link to="/soforthilfe" className="text-sm font-medium text-destructive">
            {tr(ui.nav.crisis)}
          </Link>
          <LanguageToggle />
        </div>
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

/**
 * Device preview: lets anyone see the app's phone/tablet layout without
 * needing browser DevTools. It works by loading the app itself inside an
 * <iframe> of a fixed pixel width — an iframe has its own layout viewport,
 * so the same responsive CSS that reacts to a real phone's width reacts to
 * it here too (a plain scaled-down <div> would not: Tailwind's `sm:`
 * breakpoints match the browser window's width, not a container's width).
 */
type PreviewMode = "desktop" | "tablet" | "mobile";

const DEVICE_SIZE: Record<Exclude<PreviewMode, "desktop">, { width: number; height: number }> = {
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

function ViewToggle({ mode, onChange }: { mode: PreviewMode; onChange: (m: PreviewMode) => void }) {
  const labels: Record<PreviewMode, string> = {
    desktop: "Desktop",
    tablet: "Tablet",
    mobile: "Mobile",
  };
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground">View:</span>
      {(["desktop", "tablet", "mobile"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={mode === m ? "font-semibold text-foreground" : "text-muted-foreground"}
        >
          {labels[m]}
        </button>
      ))}
    </div>
  );
}

function DevicePreviewFrame({ mode, src }: { mode: Exclude<PreviewMode, "desktop">; src: string }) {
  const { width, height } = DEVICE_SIZE[mode];
  return (
    <div className="flex flex-col items-center gap-2 bg-secondary px-4 py-8">
      <div
        className="overflow-hidden rounded-2xl border-4 border-foreground/70 bg-background"
        style={{ width, height }}
      >
        {src ? (
          <iframe
            title={`${mode} preview`}
            src={src}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{width}px wide</p>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [frameSrc, setFrameSrc] = useState("");
  const [mounted, setMounted] = useState(false);
  const [framed, setFramed] = useState(false);

  // Client-only: detect whether this page is itself running inside the
  // preview iframe below, so that document never tries to nest itself.
  useEffect(() => {
    setMounted(true);
    setFramed(window.self !== window.top);
  }, []);

  const changeMode = (m: PreviewMode) => {
    setMode(m);
    if (m !== "desktop") setFrameSrc(window.location.href);
  };

  // The landing page ("/") is a bare splash screen: no header or footer.
  const isLanding = useRouterState({ select: (s) => s.location.pathname === "/" });

  const previewDevice = mode === "desktop" ? null : mode;
  const showFrame = mounted && !framed && previewDevice !== null;

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SessionProvider>
          {!framed && (
            <div className="border-b border-border bg-secondary/60 px-4 py-1.5 print:hidden">
              <div className="mx-auto flex max-w-3xl justify-end">
                <ViewToggle mode={mode} onChange={changeMode} />
              </div>
            </div>
          )}
          {showFrame && previewDevice ? (
            <DevicePreviewFrame mode={previewDevice} src={frameSrc} />
          ) : (
            <div className="flex min-h-screen flex-col">
              {!isLanding && <SiteHeader />}
              <main className="flex-1">
                {/* Required: nested routes render here. */}
                <Outlet />
              </main>
              {!isLanding && <SiteFooter />}
            </div>
          )}
        </SessionProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
