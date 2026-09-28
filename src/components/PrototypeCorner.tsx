import { InfoTooltip } from "@/components/InfoTooltip";
import { useLang } from "@/lib/i18n";
import home from "@/content/home.json";

/**
 * A triangular "Research prototype" flag pinned to the top-right corner of
 * every page — rendered once in the root layout's `relative` <main>
 * (src/routes/__root.tsx). The explanation lives in its
 * hover/focus tooltip, so the caveat is always visible without taking up
 * room in the page copy.
 *
 * The triangle is a square button cut with `clip-path`, which also clips
 * its hit area to the triangle. The label is centred on a point along the
 * corner's diagonal and rotated 45° so it runs parallel to the long edge.
 */
export function PrototypeCorner() {
  const { tr } = useLang();
  return (
    <div className="absolute right-0 top-0 z-20 print:hidden">
      <InfoTooltip
        description={tr(home.prototypeInfo.note)}
        align="end"
        panelClassName="w-72"
        triggerClassName="relative block h-28 w-28 cursor-help bg-prototype text-prototype-foreground shadow-sm outline-none [clip-path:polygon(0_0,100%_0,100%_100%)] hover:brightness-95 focus-visible:brightness-90"
      >
        <span className="absolute left-[70%] top-[30%] -translate-x-1/2 -translate-y-1/2 rotate-45 whitespace-pre-line text-center text-[10px] font-bold uppercase leading-tight tracking-wider">
          {tr(home.prototypeInfo.corner)}
        </span>
      </InfoTooltip>
    </div>
  );
}
