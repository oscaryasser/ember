import { e1rm } from "./util.js";

// Exercise history across all logged days: [{ k, sets, topW, best }] sorted by date,
// where `best` is the day's max Epley e1RM.
export function exerciseHistory(data, exName) {
  const out = [];
  for (const [k, day] of Object.entries(data.days)) {
    const sets = collectSets(day, exName);
    if (!sets.length) continue;
    const best = Math.max(...sets.map((s) => e1rm(s.w, s.r)));
    const topW = Math.max(...sets.map((s) => s.w || 0));
    out.push({ k, sets, topW, best });
  }
  return out.sort((a, b) => (a.k < b.k ? -1 : 1));
}

// Scan every strength-day bucket (P/U/L now, legacy A/B still present in old
// logs) so history stays continuous across a program change.
function collectSets(day, exName) {
  const res = [];
  for (const id of Object.keys(day?.sets || {})) {
    const s = day.sets[id]?.[exName];
    if (s && s.length) res.push(...s);
  }
  return res;
}

// Every exercise name that has at least one logged set, with session counts.
export function loggedExercises(data) {
  const map = new Map();
  for (const day of Object.values(data.days)) {
    for (const id of Object.keys(day?.sets || {})) {
      for (const [name, sets] of Object.entries(day.sets[id] || {})) {
        if (sets && sets.length) map.set(name, (map.get(name) || 0) + 1);
      }
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, sessions]) => ({ name, sessions }));
}

// Best e1RM strictly before `dateKey` (for live PR detection while logging).
export function bestBefore(data, exName, dateKey) {
  let best = 0;
  for (const [k, day] of Object.entries(data.days)) {
    if (k >= dateKey) continue;
    for (const s of collectSets(day, exName)) best = Math.max(best, e1rm(s.w, s.r));
  }
  return best;
}

// Append a set to a day and detect a PR against real history (shared by the
// strength card and gym mode so the rules can never drift apart).
export function buildSetPatch(data, day, dateKey, id, exName, w, r) {
  const todaySets = ((day.sets || {})[id] || {})[exName] || [];
  const newE1 = e1rm(w ?? 0, r);
  const prevBest = Math.max(bestBefore(data, exName, dateKey), ...todaySets.map((s) => e1rm(s.w, s.r)), 0);
  const sets = { ...(day.sets || {}) };
  sets[id] = { ...(sets[id] || {}) };
  sets[id][exName] = [...todaySets, { w: w ?? 0, r }];
  const hadHistory = lastSetsFor(data, id, exName, dateKey) !== null;
  const pr = hadHistory && prevBest > 0 && newE1 > prevBest
    ? { name: exName, w: w ?? 0, r, new: newE1, old: prevBest }
    : null;
  return { sets, pr };
}

// Most recent prior day this exercise was logged, under any strength-day
// bucket (so the "last time" hint follows an exercise across program changes).
export function lastSetsFor(data, id, exName, beforeKey) {
  const keys = Object.keys(data.days).filter((k) => k < beforeKey).sort().reverse();
  for (const k of keys) {
    const buckets = data.days[k]?.sets || {};
    for (const bid of Object.keys(buckets)) {
      const s = buckets[bid]?.[exName];
      if (s && s.length) return { k, sets: s };
    }
  }
  return null;
}
