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

function collectSets(day, exName) {
  const res = [];
  for (const id of ["A", "B"]) {
    const s = day?.sets?.[id]?.[exName];
    if (s && s.length) res.push(...s);
  }
  return res;
}

// Every exercise name that has at least one logged set, with session counts.
export function loggedExercises(data) {
  const map = new Map();
  for (const day of Object.values(data.days)) {
    for (const id of ["A", "B"]) {
      for (const [name, sets] of Object.entries(day?.sets?.[id] || {})) {
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

export function lastSetsFor(data, id, exName, beforeKey) {
  const keys = Object.keys(data.days).filter((k) => k < beforeKey).sort().reverse();
  for (const k of keys) {
    const s = data.days[k]?.sets?.[id]?.[exName];
    if (s && s.length) return { k, sets: s };
  }
  return null;
}
