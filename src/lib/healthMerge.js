// Pure mapping of HealthKit samples into the ember day model.
//
// Two hard rules from the data contract:
//   1. ember:data:v1 schema is untouched — we only write the SAME string
//      fields the manual UI writes (weight/steps/sleepHours/calActive) plus a
//      passed-through `health` provenance blob (sanitizeDay keeps unknown keys).
//   2. Manual entry ALWAYS wins. Health may fill an empty field, and may update
//      a field it wrote last time (the user never touched it), but it must
//      never clobber a value the user typed by hand.
import { round1, num } from "./util.js";

// HealthKit workout activity type → an ember activity chip id.
// Running maps to the existing "run" card. Strength maps to a Push/Pull/Legs
// split id resolved by the caller (scheduled split for that weekday).
export const HEALTH_FIELDS = ["weight", "steps", "sleepHours", "calActive"];

// One day's raw samples → the string fields the manual UI uses.
// bodyMass in lbs, activeEnergy in kcal — the Swift plugin normalizes units.
export function healthToFields(sample) {
  const f = {};
  if (sample == null) return f;
  const bm = num(sample.bodyMass);
  if (bm !== null && bm > 0) f.weight = String(round1(bm));
  const st = num(sample.steps);
  if (st !== null && st > 0) f.steps = String(Math.round(st));
  const sl = num(sample.sleepHours);
  if (sl !== null && sl > 0) f.sleepHours = String(round1(sl));
  const ae = num(sample.activeEnergy);
  if (ae !== null && ae > 0) f.calActive = String(Math.round(ae));
  return f;
}

// Merge one day's mapped fields (+ workout activity ids) into a day record.
// Returns a NEW day object; never mutates. `workoutIds` is an ordered list of
// activity chip ids ("run", "P"/"U"/"L") the day's HealthKit workouts imply.
export function applyHealthToDay(day, fields, workoutIds = []) {
  const src = day && typeof day === "object" ? day : {};
  const prevFields = (src.health && src.health.fields) || {};
  const out = { ...src };
  const nextFields = { ...prevFields };

  for (const k of HEALTH_FIELDS) {
    const val = fields[k];
    if (val === undefined || val === "" || val === null) continue;
    const cur = out[k];
    const curEmpty = cur === undefined || cur === null || cur === "";
    // Fill when empty, or refresh a value Health itself last wrote. A value the
    // user changed by hand (non-empty, differs from our last write) is kept.
    if (curEmpty || String(cur) === String(prevFields[k])) {
      out[k] = val;
      nextFields[k] = val;
    }
  }

  if (workoutIds.length) {
    const acts = Array.isArray(out.activities) ? [...out.activities] : [];
    for (const id of workoutIds) if (id && !acts.includes(id)) acts.push(id);
    out.activities = acts;
  }

  out.health = { ...(src.health || {}), fields: nextFields, syncedAt: Date.now() };
  return out;
}

// Map a day's HealthKit workouts to ember activity ids.
// `resolveStrengthId(dateKey)` returns the split id ("P"/"U"/"L") to credit a
// strength workout on that date (scheduled split, else a default).
export function workoutIdsFor(workouts, dateKey, resolveStrengthId) {
  const ids = [];
  for (const w of workouts || []) {
    const kind = w && w.kind;
    if (kind === "run" && !ids.includes("run")) ids.push("run");
    else if (kind === "strength") {
      const sid = resolveStrengthId ? resolveStrengthId(dateKey) : "P";
      if (sid && !ids.includes(sid)) ids.push(sid);
    }
  }
  return ids;
}

// Walk a whole HealthKit result into a new data object.
// byDay: { "YYYY-MM-DD": { bodyMass, steps, sleepHours, activeEnergy, workouts:[{kind}] } }
export function mergeHealthImport(data, byDay, resolveStrengthId) {
  if (!data || !byDay) return data;
  const days = { ...data.days };
  for (const [key, sample] of Object.entries(byDay)) {
    const fields = healthToFields(sample);
    const workoutIds = workoutIdsFor(sample.workouts, key, resolveStrengthId);
    if (Object.keys(fields).length === 0 && workoutIds.length === 0) continue;
    days[key] = applyHealthToDay(days[key], fields, workoutIds);
  }
  return { ...data, days, health: { ...(data.health || {}), lastSync: Date.now() } };
}
