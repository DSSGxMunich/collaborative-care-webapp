import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronIcon, HelpIcon } from "@/components/icons";
import { PageBody, PageHero } from "@/components/PageHero";
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
    <>
      <PageHero icon={<HelpIcon className="h-6 w-6" />} title={tr(f.title)} intro={tr(f.intro)} />
      <PageBody>
        {/* Native <details> accordions: keyboard- and screen-reader-friendly with no JS. */}
        <div className="space-y-3">
          {f.items.map((item) => (
            <details key={item.id} className="panel group p-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {tr(item.question)}
                <ChevronIcon className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
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
              </p>
            </details>
          ))}
        </div>
      </PageBody>
    </>
  );
}
