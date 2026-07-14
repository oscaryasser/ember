// Adaptive targets: measure the REAL energy budget from logged intake and the
// weight trend, instead of trusting formulas or the watch. Energy balance:
//   TDEE ≈ average intake − (weight slope in lb/day × 3500)
// Losing on 2,100/day at 1 lb/week means the body is actually burning ~2,600 —
// that measured number is what targets should be built on.
import { keyOffset } from "./dates.js";
import { num, intakeOf } from "./util.js";

export const WINDOW_DAYS = 28;
export const MIN_INTAKE_DAYS = 8;
export const MIN_WEIGH_SPAN_DAYS = 10;
export const KCAL_PER_LB = 3500;

// Least-squares slope of weigh-ins (lb per day) over the window.
// Robust to sparse, unevenly spaced weigh-ins — exactly what 1–2×/week gives.
export function weightSlope(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0, sxx = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) * (p.x - mx);
  }
  return sxx === 0 ? null : sxy / sxx;
}

// Measured TDEE over the trailing window ending at `endOffset` days ago.
// Returns null (with a reason) until there's enough data to be honest.
export function estimateTDEE(data, endOffset = 0) {
  const intakes = [];
  const weighins = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const k = keyOffset(-(i + endOffset));
    const d = data.days[k];
    const cin = intakeOf(d);
    if (cin !== null) intakes.push(cin);
    const w = d ? num(d.weight) : null;
    if (w !== null) weighins.push({ x: WINDOW_DAYS - i, y: w }); // x in days, ascending
  }
  if (intakes.length < MIN_INTAKE_DAYS) {
    return { ok: false, reason: `need ${MIN_INTAKE_DAYS}+ logged intake days in the last ${WINDOW_DAYS} (have ${intakes.length})` };
  }
  const span = weighins.length >= 2 ? Math.max(...weighins.map((p) => p.x)) - Math.min(...weighins.map((p) => p.x)) : 0;
  if (weighins.length < 3 || span < MIN_WEIGH_SPAN_DAYS) {
    return { ok: false, reason: `need 3+ weigh-ins spanning ${MIN_WEIGH_SPAN_DAYS}+ days (have ${weighins.length} over ${span}d)` };
  }
  const slope = weightSlope(weighins); // lb/day, negative = losing
  const avgIntake = intakes.reduce((a, b) => a + b, 0) / intakes.length;
  const tdee = avgIntake - slope * KCAL_PER_LB;
  if (!isFinite(tdee) || tdee < 1200 || tdee > 6000) {
    return { ok: false, reason: "the numbers don't add up yet — keep logging, noise shrinks with data" };
  }
  return {
    ok: true,
    tdee: Math.round(tdee / 10) * 10,
    avgIntake: Math.round(avgIntake),
    lbsPerWeek: Math.round(slope * 7 * 100) / 100,
    intakeDays: intakes.length,
    weighIns: weighins.length,
    spanDays: span,
  };
}

// Average Garmin total burn over recent days — the provisional stand-in for
// TDEE until the measured number has enough history behind it.
export function garminBurnAvg(data, days = 14) {
  const vals = [];
  for (let i = 0; i < days; i++) {
    const d = data.days[keyOffset(-i)];
    if (!d) continue;
    const burn = (num(d.calActive) || 0) + (num(d.calResting) || 0);
    if (burn > 800) vals.push(burn); // skip zero/partial entries
  }
  return vals.length >= 3 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

// Resolve today's calorie + macro targets. Manual goals always win; blank
// goals fall back to measured TDEE − deficit, then to Garmin burn − deficit
// (provisional), so the macro bars have a scale from the first week.
// Split: protein = goal, fat 30% of calories, carbs get the remainder.
export function resolveTargets(data) {
  const g = data.goals;
  const est = estimateTDEE(data);
  const deficit = num(g.deficit) || 0;
  const round10 = (v) => Math.round(v / 10) * 10;
  const manual = num(g.calTarget);
  const measured = est.ok ? round10(est.tdee - deficit) : null;
  const garmin = garminBurnAvg(data);
  const provisional = garmin !== null ? round10(garmin - deficit) : null;
  const kcal = manual ?? measured ?? provisional;
  const source = manual !== null ? "manual" : measured !== null ? "measured" : provisional !== null ? "garmin" : null;
  const protein = num(g.protein);
  const fat = num(g.fat) ?? (kcal !== null ? Math.round((kcal * 0.30) / 9 / 5) * 5 : null);
  const carbs = num(g.carbs) ?? (kcal !== null && protein !== null && fat !== null
    ? Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4 / 5) * 5)
    : null);
  return {
    kcal, protein, fat, carbs, est, source, garmin,
    kcalAuto: manual === null,
    fatAuto: num(g.fat) === null,
    carbsAuto: num(g.carbs) === null,
  };
}

// Calories from macros (Atwater 4/4/9) — for auto-filling new food entries.
export const kcalFromMacros = (p, c, f) =>
  Math.round((num(p) || 0) * 4 + (num(c) || 0) * 4 + (num(f) || 0) * 9);
