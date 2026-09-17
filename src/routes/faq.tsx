import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, type L } from "@/lib/i18n";
import faqContent from "@/content/faq.json";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Häufige Fragen – Versorgungskompass" },
      { name: "description", content: faqContent.intro.de },
    ],
  }),
  component: Faq,
});

type FaqItem = {
  id: string;
  question: L;
  answer: L;
  link?: { to: string; label: L };
  linkSuffix?: L;
};

const f = faqContent as { title: L; intro: L; items: FaqItem[] };

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
              {item.link && (
                <>
                  {" "}
                  <Link to={item.link.to} className="text-primary underline underline-offset-2">
                    {tr(item.link.label)}
                  </Link>
                  {item.linkSuffix && <> {tr(item.linkSuffix)}</>}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
