import { createFileRoute } from "@tanstack/react-router";
import katex from "katex";
import "katex/dist/katex.css";
import { useLang } from "@/lib/i18n";
import methodologyContent from "@/content/methodology.json";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodik – Versorgungskompass" },
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
      className="overflow-x-auto rounded-md border border-border bg-muted/50 p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function Methodology() {
  const { tr } = useLang();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{tr(m.title)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(m.intro)}</p>

      <div className="mt-8 space-y-10">
        {m.sections.map((section) => (
          <section key={section.id}>
            <h2 className="text-lg font-semibold">{tr(section.heading)}</h2>
            <div className="mt-2 space-y-3">
              {section.body.map((paragraph, i) =>
                "latex" in paragraph && paragraph.latex ? (
                  <LatexBlock key={i} tex={tr(paragraph)} />
                ) : "placeholder" in paragraph && paragraph.placeholder ? (
                  <p
                    key={i}
                    className="rounded-md border border-dashed border-border p-3 text-sm italic text-muted-foreground"
                  >
                    {tr(paragraph)}
                  </p>
                ) : (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {tr(paragraph)}
                  </p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
