/**
 * Decorative hero illustration for the landing page: a compass on an open
 * map, with dotted paths leading to the kinds of support the tool compares
 * (everyday habits, sleep, people around you, psychological support).
 * Purely decorative — hidden from screen readers.
 *
 * Drawn only in the theme colours so it matches the logo (CompassMark):
 * white (--card) paper and bubbles, pine (--primary) lines and icons, and
 * the coral (--accent) needle as the single warm highlight. It sits on the
 * pale-pine hero band (--brand-soft) and follows light/dark mode.
 */
export function HomeIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 380"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Soft clouds */}
      <g fill="var(--card)" opacity="0.7">
        <ellipse cx="60" cy="205" rx="44" ry="18" />
        <ellipse cx="82" cy="192" rx="26" ry="18" />
        <ellipse cx="438" cy="95" rx="36" ry="14" />
        <ellipse cx="452" cy="84" rx="20" ry="14" />
      </g>

      {/* Ground shadow + folded map */}
      <ellipse cx="250" cy="352" rx="190" ry="14" fill="var(--primary)" opacity="0.08" />
      <g stroke="var(--border)" strokeWidth="1.5" fill="var(--card)">
        <path d="M58 262 L178 228 L192 330 L70 350 Z" />
        <path d="M178 228 L302 256 L312 350 L192 330 Z" opacity="0.94" />
        <path d="M302 256 L422 222 L434 322 L312 350 Z" />
      </g>
      {/* Map "terrain" patches */}
      <g fill="var(--brand-soft)">
        <path d="M84 300 q20 -22 44 -10 q18 10 34 -4 l6 38 q-40 10 -80 4 Z" />
        <path d="M330 300 q24 -20 48 -6 q16 8 40 -8 l6 30 q-50 14 -92 18 Z" />
        <path d="M206 262 q18 -8 30 4 q-10 14 -28 10 Z" />
      </g>

      {/* Dotted paths from the compass out to each kind of support */}
      <g stroke="var(--primary)" strokeWidth="3" strokeDasharray="2 9" opacity="0.55">
        <path d="M200 230 C 160 210, 170 170, 128 140" />
        <path d="M236 170 C 232 140, 226 118, 222 96" />
        <path d="M290 190 C 316 160, 330 140, 344 118" />
        <path d="M312 240 C 350 240, 372 220, 396 204" />
      </g>

      {/* Compass */}
      <g>
        <circle cx="250" cy="242" r="74" fill="var(--primary)" />
        <circle cx="250" cy="242" r="62" fill="var(--card)" />
        <rect x="241" y="160" width="18" height="12" rx="3" fill="var(--primary)" />
        <circle cx="250" cy="150" r="11" stroke="var(--primary)" strokeWidth="5" />
        <g stroke="var(--primary)" strokeWidth="4" opacity="0.5">
          <path d="M250 188 v10" />
          <path d="M250 286 v10" />
          <path d="M196 242 h10" />
          <path d="M294 242 h10" />
        </g>
        {/* Same needle angle as the logo (45°, up and to the right) */}
        <g transform="rotate(45 250 242)">
          <path d="M250 194 L263 242 L237 242 Z" fill="var(--accent)" />
          <path d="M250 284 L263 242 L237 242 Z" fill="var(--primary)" />
        </g>
        <circle cx="250" cy="242" r="6" fill="var(--card)" />
      </g>

      {/* Speech bubbles with icons */}
      <Bubble cx={110} cy={120}>
        {/* Sprout: everyday habits / activity */}
        <path d="M0 16 V-2" />
        <path d="M0 2 C0 -12 -8 -16 -16 -16 C-16 -4 -8 2 0 2 Z" />
        <path d="M0 -2 C0 -14 8 -18 16 -18 C16 -6 8 -2 0 -2 Z" />
      </Bubble>
      <Bubble cx={222} cy={70}>
        {/* Bed: sleep */}
        <path d="M-18 -12 V14" />
        <path d="M-18 6 H18 V14" />
        <path d="M-6 6 V-6 H12 a6 6 0 0 1 6 6 V6" />
        <circle cx="-11" cy="-1" r="3.5" />
      </Bubble>
      <Bubble cx={352} cy={94}>
        {/* People: care team and those around you */}
        <circle cx="0" cy="-8" r="6" />
        <path d="M-11 16 v-4 a11 11 0 0 1 22 0 v4" />
        <circle cx="-15" cy="-4" r="4.5" />
        <path d="M-24 14 v-2 a8 8 0 0 1 6 -8" />
        <circle cx="15" cy="-4" r="4.5" />
        <path d="M24 14 v-2 a8 8 0 0 0 -6 -8" />
      </Bubble>
      <Bubble cx={414} cy={186}>
        {/* Head with heart: psychological support */}
        <path d="M-6 18 v-7 c-8 -4 -12 -10 -12 -18 c0 -11 9 -18 19 -18 c10 0 17 7 17 16 l4 7 h-5 v6 c0 4 -3 6 -7 6 h-3 v8" />
        <path d="M2 2 l-7 -6 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5 Z" />
      </Bubble>

      {/* Leaves at the map's edges */}
      <g fill="var(--primary)" opacity="0.8">
        <path d="M44 330 c-6 -24 6 -40 24 -44 c4 20 -6 38 -24 44 Z" />
        <path d="M36 334 c-20 -6 -28 -20 -26 -34 c18 2 28 16 26 34 Z" opacity="0.6" />
        <path d="M450 316 c4 -24 -8 -40 -26 -42 c-2 20 8 36 26 42 Z" />
        <path d="M456 320 c20 -8 26 -22 22 -36 c-18 4 -26 18 -22 36 Z" opacity="0.6" />
      </g>
    </svg>
  );
}

/**
 * A round white speech bubble with a small tail pointing down-left; its
 * children are the icon strokes, drawn in pine and centred on (cx, cy).
 */
function Bubble({ cx, cy, children }: { cx: number; cy: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M-14 30 L-8 46 L6 34 Z" fill="var(--card)" />
      <circle r="36" fill="var(--card)" />
      <g stroke="var(--primary)" strokeWidth="3.5">
        {children}
      </g>
    </g>
  );
}
