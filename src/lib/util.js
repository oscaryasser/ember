export const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

// Food-log entries for a day. Each entry stores its own computed totals so
// history survives library edits and deletions.
export const mealsOf = (d) => (d && Array.isArray(d.meals) ? d.meals : []);

export const mealTotals = (d) => {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const m of mealsOf(d)) {
    t.kcal += num(m.kcal) || 0;
    t.p += num(m.p) || 0;
    t.c += num(m.c) || 0;
    t.f += num(m.f) || 0;
  }
  return t;
};

// Calories in: a typed MFP total always wins; otherwise the food log fills it.
export const intakeOf = (day) => {
  if (!day) return null;
  const manual = num(day.calIn);
  if (manual !== null) return manual;
  const meals = mealTotals(day).kcal;
  return meals > 0 ? Math.round(meals) : null;
};

// Net energy for a day: calories in minus total burn. Negative = deficit.
export const netOf = (day) => {
  if (!day) return null;
  const cin = intakeOf(day);
  const act = num(day.calActive);
  const rest = num(day.calResting);
  if (cin === null || (act === null && rest === null)) return null;
  return cin - ((act || 0) + (rest || 0));
};

// Total protein: legacy single `protein` field, quick-add entries, and the
// food log's protein all count — they're different foods, not duplicates.
export const proteinOf = (d) => {
  if (!d) return 0;
  const legacy = num(d.protein) || 0;
  return legacy + (d.proteinEntries || []).reduce((a, b) => a + b, 0) + mealTotals(d).p;
};

// Total sleep for a day: overnight + naps. Null until either is logged.
export const sleepTotalOf = (d) => {
  if (!d) return null;
  const night = num(d.sleepHours);
  const nap = num(d.napHours);
  if (night === null && nap === null) return null;
  return (night || 0) + (nap || 0);
};

export const hasAnyLog = (d) =>
  !!d &&
  ((d.activities || []).length > 0 ||
    netOf(d) !== null ||
    num(d.weight) !== null ||
    proteinOf(d) > 0 ||
    mealsOf(d).length > 0 ||
    num(d.steps) !== null ||
    sleepTotalOf(d) !== null);

// Epley estimated 1RM. Bodyweight-only sets (w=0) have no meaningful e1RM.
export const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);

export const round1 = (v) => Math.round(v * 10) / 10;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const sanitizeDecimal = (v) => v.replace(/[^0-9.]/g, "");
export const sanitizeInt = (v) => v.replace(/[^0-9]/g, "");

// Parse a stored snapshot; anything unreadable or non-object counts as absent.
export const safeParse = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  try {
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : null;
  } catch { return null; }
};

// Choose between the two persisted snapshots (localStorage vs IDB mirror):
// a missing/corrupt copy loses, otherwise the newer savedAt wins.
export const pickFresher = (a, b) =>
  !a ? b || null : !b ? a : (b.savedAt || 0) > (a.savedAt || 0) ? b : a;

// Coerce one day record into a renderable shape. Hand-edited backups and
// interrupted writes are the inputs here — every field the UI dereferences
// must come out safe, unknown fields must pass through untouched.
export function sanitizeDay(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  const out = { ...d };
  out.activities = Array.isArray(d.activities) ? d.activities.filter((a) => typeof a === "string") : [];
  out.checks = d.checks && typeof d.checks === "object" && !Array.isArray(d.checks) ? d.checks : {};
  if (d.sets !== undefined && (typeof d.sets !== "object" || d.sets === null || Array.isArray(d.sets))) delete out.sets;
  if (d.proteinEntries !== undefined) {
    out.proteinEntries = (Array.isArray(d.proteinEntries) ? d.proteinEntries : [])
      .map((v) => num(v))
      .filter((v) => v !== null && v > 0);
  }
  if (d.measurements !== undefined && (typeof d.measurements !== "object" || d.measurements === null)) delete out.measurements;
  if (d.swaps !== undefined && (typeof d.swaps !== "object" || d.swaps === null || Array.isArray(d.swaps))) delete out.swaps;
  if (d.meals !== undefined) {
    out.meals = (Array.isArray(d.meals) ? d.meals : [])
      .filter((m) => m && typeof m === "object" && !Array.isArray(m))
      .map((m) => ({
        name: typeof m.name === "string" ? m.name : "food",
        qty: num(m.qty) ?? 1,
        kcal: num(m.kcal) ?? 0,
        p: num(m.p) ?? 0,
        c: num(m.c) ?? 0,
        f: num(m.f) ?? 0,
        ...(m.foodId !== undefined ? { foodId: m.foodId } : {}),
      }));
  }
  if (d.pullups !== undefined) {
    if (d.pullups && typeof d.pullups === "object" && !Array.isArray(d.pullups)) {
      out.pullups = { ...d.pullups, sets: Array.isArray(d.pullups.sets) ? d.pullups.sets : [] };
      if (out.pullups.test && typeof out.pullups.test !== "object") delete out.pullups.test;
    } else delete out.pullups;
  }
  return out;
}
