import { useState } from "react";
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
  // Track which questions are expanded; all collapsed by default.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{tr(f.title)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tr(f.intro)}</p>

      <ul className="mt-6 space-y-3">
        {f.items.map((item) => {
          const isOpen = openIds.has(item.id);
          const panelId = `faq-panel-${item.id}`;
          return (
            <li
              key={item.id}
              className={`rounded-2xl border transition-colors ${
                isOpen ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className={`text-sm font-semibold ${isOpen ? "text-primary" : ""}`}>
                  {tr(item.question)}
                </span>
                <span
                  aria-hidden="true"
                  className={`shrink-0 text-xl leading-none ${isOpen ? "text-primary" : "text-muted-foreground"}`}
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div
                  id={panelId}
                  className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground"
                >
                  {tr(item.answer)}
                  {item.link && (
                    <>
                      {" "}
                      <Link
                        to={item.link.to}
                        className="text-primary underline underline-offset-2"
                      >
                        {tr(item.link.label)}
                      </Link>
                      {item.linkSuffix && <> {tr(item.linkSuffix)}</>}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
