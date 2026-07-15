// Gym arithmetic nobody should do tired: plate loading and warm-up ramps.

export const BAR = 45;
const PLATES = [45, 35, 25, 10, 5, 2.5];

// Per-side plate breakdown for a barbell/plate-loaded total.
// Returns { perSide: [45, 25, 2.5], achieved } — achieved may round DOWN to
// the nearest loadable weight; null when the target is below the bar.
export function plateBreakdown(total, bar = BAR) {
  if (!total || total < bar) return null;
  let side = (total - bar) / 2;
  const perSide = [];
  for (const p of PLATES) {
    while (side >= p) { perSide.push(p); side -= p; }
  }
  return { perSide, achieved: bar + 2 * perSide.reduce((a, b) => a + b, 0) };
}

// Warm-up ladder to a working weight: bar → 50% → 70%, rounded to 5s,
// skipping steps that land at/below the previous one.
export function warmupRamp(work, bar = BAR) {
  if (!work || work <= bar + 10) return [{ label: "1 easy set", w: work || bar, r: 10 }];
  const r5 = (v) => Math.max(bar, Math.round(v / 5) * 5);
  const steps = [{ label: "Bar", w: bar, r: 10 }];
  for (const [pct, r] of [[0.5, 5], [0.7, 3]]) {
    const w = r5(work * pct);
    if (w > steps[steps.length - 1].w && w < work) steps.push({ label: `${Math.round(pct * 100)}%`, w, r });
  }
  return steps;
}
