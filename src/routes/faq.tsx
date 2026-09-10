import { createFileRoute } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import faqContent from "@/content/faq.json";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Häufige Fragen – Depressions-Kompass" },
      { name: "description", content: faqContent.intro.de },
    ],
  }),
  component: Faq,
});

const f = faqContent;

function Faq() {
  const { tr } = useLang();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{tr(f.title)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(f.intro)}</p>

      <dl className="mt-6 divide-y divide-border border-y border-border">
        {f.items.map((item) => (
          <div key={item.id} className="py-4">
            <dt className="text-sm font-semibold">{tr(item.question)}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {tr(item.answer)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
