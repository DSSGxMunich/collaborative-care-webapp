/**
 * The Collaborative Care Compass logo: an open "C" ring (Care / Compass)
 * with a needle pointing out through the gap, towards the upper right —
 * "a way forward". Pine ring, coral needle tip, from the theme tokens so
 * it follows light/dark mode.
 *
 * Geometry (32×32 box, centre 16,16, radius 13): the ring is a 330° arc
 * that leaves a 30° gap centred on 45° up-right, and the needle is rotated
 * 45° so its tip sits in that gap. Keep FAVICON_SVG below in sync.
 */
export function CompassMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path
        d="M22.5 4.74 A13 13 0 1 0 27.26 9.5"
        fill="none"
        className="stroke-primary"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <g transform="rotate(45 16 16)">
        <path d="M16 3.5 L19.4 16 L12.6 16 Z" className="fill-accent" />
        <path d="M16 22 L19.4 16 L12.6 16 Z" className="fill-primary" />
      </g>
    </svg>
  );
}

/**
 * The same mark as a standalone SVG for the browser-tab icon. A favicon
 * can't read the page's CSS variables, so the pine and coral are written
 * out as hex approximations of --primary and --accent.
 */
const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  '<path d="M22.5 4.74A13 13 0 1 0 27.26 9.5" fill="none" stroke="#165343" stroke-width="3.2" stroke-linecap="round"/>' +
  '<g transform="rotate(45 16 16)">' +
  '<path d="M16 3.5L19.4 16H12.6Z" fill="#d66e4e"/>' +
  '<path d="M16 22L19.4 16H12.6Z" fill="#165343"/>' +
  "</g></svg>";

/** Inline data URI, so the icon works under any deploy base path (no /favicon.ico request). */
export const FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`;
