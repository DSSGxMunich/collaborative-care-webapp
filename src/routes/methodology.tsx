import { createFileRoute } from "@tanstack/react-router";
import katex from "katex";
import "katex/dist/katex.css";
import { BookIcon } from "@/components/icons";
import { PageBody, PageHero } from "@/components/PageHero";
import { useLang } from "@/lib/i18n";
import methodologyContent from "@/content/methodology.json";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodik | Versorgungskompass" },
      { name: "description", content: methodologyContent.intro.de },
    ],
  }),
  component: Methodology,
});

const m = methodologyContent;

function LatexBlock({ tex }: { tex: string }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: true });
  return (
    <div
      className="overflow-x-auto rounded-lg border border-border bg-muted p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Methodology() {
  const { tr } = useLang();
  return (
    <>
      <PageHero icon={<BookIcon className="h-6 w-6" />} title={tr(m.title)} intro={tr(m.intro)} />
      <PageBody>
        <ol className="space-y-6">
          {m.sections.map((section, i) => (
            <li key={section.id} className="panel flex gap-4 p-6">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-primary"
              >
                {i + 1}
              </span>
              <section className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold leading-snug">{tr(section.heading)}</h2>
                <div className="mt-2 space-y-3">
                  {section.body.map((paragraph, j) =>
                    "latex" in paragraph && paragraph.latex ? (
                      <LatexBlock key={j} tex={tr(paragraph)} />
                    ) : (
                      <p key={j} className="text-sm leading-relaxed text-muted-foreground">
                        {tr(paragraph)}
                      </p>
                    ),
                  )}
                </div>
              </section>
            </li>
          ))}
        </ol>
      </PageBody>
    </>
  );
}
