// Consistent 24x24 line-icon set. stroke 1.9, rounded caps/joins, currentColor
// so callers color via CSS/inline `color`. Replaces the emoji glyphs.
const P = {
  flame: <><path d="M12 3c1.2 3-2.6 4.4-2.6 8a2.6 2.6 0 0 0 5.2 0c0-1-.4-1.9-.9-2.6C15.6 10 17 12 17 14.5a5 5 0 0 1-10 0c0-3.3 2.4-5 3.6-7.2C11.4 6 11.8 4.5 12 3Z" /></>,
  scale: <><path d="M12 4v3" /><circle cx="12" cy="4" r="1.2" /><path d="M5 7h14" /><path d="M5 7 2.5 13a3.5 3.5 0 0 0 5 0L5 7Z" /><path d="M19 7l-2.5 6a3.5 3.5 0 0 0 5 0L19 7Z" /><path d="M9 20h6" /><path d="M12 7v13" /></>,
  food: <><path d="M6 3v7a2 2 0 0 0 4 0V3" /><path d="M8 3v18" /><path d="M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5Z" /><path d="M17 12v9" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  dumbbell: <><path d="M6.5 8v8M4 9.5v5M17.5 8v8M20 9.5v5M6.5 12h11" /></>,
  run: <><circle cx="14" cy="5" r="1.8" /><path d="M13 9l-3 2 2 3 1 5" /><path d="M10 11l-3 1-1 3" /><path d="M12 14l3 1 2-1" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5.5a2.5 2.5 0 0 0 2.7 3M16 6h2.5a2.5 2.5 0 0 1-2.7 3" /><path d="M12 12v3M9 20h6M10 20l.5-3h3l.5 3" /></>,
  trash: <><path d="M4 7h16M9 7V5h6v2M6 7l1 12h10l1-12M10 11v5M14 11v5" /></>,
  camera: <><path d="M4 8h3l1.5-2h7L18 8h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v1H9V4Z" /><path d="M9 11l1.5 1.5L13 10M9 16h5" /></>,
  home: <><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /></>,
  moon: <><path d="M20 14a8 8 0 1 1-9-11 6.5 6.5 0 0 0 9 11Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
  bolt: <><path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" /></>,
  pencil: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></>,
  download: <><path d="M12 4v10M8 11l4 4 4-4M5 19h14" /></>,
  upload: <><path d="M12 15V5M8 8l4-4 4 4M5 19h14" /></>,
  warning: <><path d="M12 4 3 19h18L12 4Z" /><path d="M12 10v4M12 17h.01" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  check: <><path d="M5 12.5 10 17l9-10" /></>,
  close: <><path d="M6 6l12 12M18 6 6 18" /></>,
  swap: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  chevronDown: <><path d="M6 9l6 6 6-6" /></>,
  chevronUp: <><path d="M6 15l6-6 6 6" /></>,
  rest: <><path d="M3 12a9 9 0 1 0 9-9 7 7 0 0 1 0 18 9 9 0 0 1-9-9Z" /><path d="M14 9h4l-4 6h4" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M4 9h16M8 3v4M16 3v4" /><circle cx="12" cy="14.5" r="1.3" fill="currentColor" stroke="none" /></>,
  chart: <><path d="M4 20h16M7 16l4-5 3 3 4-6" /></>,
  box: <><path d="M4 8l8-4 8 4v8l-8 4-8-4V8Z" /><path d="M4 8l8 4 8-4M12 12v8" /></>,
};

export default function Icon({ name, size = 20, color, strokeWidth = 1.9, style, ...rest }) {
  const glyph = P[name];
  if (!glyph) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ color, display: "block", flexShrink: 0, ...style }} aria-hidden="true" {...rest}>
      {glyph}
    </svg>
  );
}
