export const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

// Net energy for a day: calories in minus total burn. Negative = deficit.
export const netOf = (day) => {
  if (!day) return null;
  const cin = num(day.calIn);
  const act = num(day.calActive);
  const rest = num(day.calResting);
  if (cin === null || (act === null && rest === null)) return null;
  return cin - ((act || 0) + (rest || 0));
};

// Total protein: legacy single `protein` field plus quick-add entries.
export const proteinOf = (d) => {
  if (!d) return 0;
  const legacy = num(d.protein) || 0;
  return legacy + (d.proteinEntries || []).reduce((a, b) => a + b, 0);
};

export const hasAnyLog = (d) =>
  !!d &&
  ((d.activities || []).length > 0 ||
    netOf(d) !== null ||
    num(d.weight) !== null ||
    proteinOf(d) > 0 ||
    num(d.steps) !== null ||
    num(d.sleepHours) !== null);

// Epley estimated 1RM. Bodyweight-only sets (w=0) have no meaningful e1RM.
export const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);

export const round1 = (v) => Math.round(v * 10) / 10;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const sanitizeDecimal = (v) => v.replace(/[^0-9.]/g, "");
export const sanitizeInt = (v) => v.replace(/[^0-9]/g, "");

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
  if (d.pullups !== undefined) {
    if (d.pullups && typeof d.pullups === "object" && !Array.isArray(d.pullups)) {
      out.pullups = { ...d.pullups, sets: Array.isArray(d.pullups.sets) ? d.pullups.sets : [] };
      if (out.pullups.test && typeof out.pullups.test !== "object") delete out.pullups.test;
    } else delete out.pullups;
  }
  return out;
}
