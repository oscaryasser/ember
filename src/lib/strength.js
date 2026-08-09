import { e1rm, normName } from "./util.js";

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
// logs) so history stays continuous across a program change. Names are matched
// case-insensitively so the same lift carries across Gym / 45-min / Home modes.
// Warm-up sets (flagged `warm`) are excluded — they never count toward e1RM.
function collectSets(day, exName) {
  const target = normName(exName);
  const res = [];
  for (const id of Object.keys(day?.sets || {})) {
    const bucket = day.sets[id] || {};
    for (const nm of Object.keys(bucket)) {
      if (normName(nm) !== target) continue;
      const s = bucket[nm];
      if (s && s.length) res.push(...s.filter((x) => !x.warm));
    }
  }
  return res;
}

// Every exercise name that has at least one logged set, with session counts.
export function loggedExercises(data) {
  // Group by normalized name so casing variants (Gym vs 45-min) count as one.
  const map = new Map(); // normKey -> { name, sessions }
  for (const day of Object.values(data.days)) {
    for (const id of Object.keys(day?.sets || {})) {
      for (const [name, sets] of Object.entries(day.sets[id] || {})) {
        if (!(sets && sets.length)) continue;
        const key = normName(name);
        const cur = map.get(key) || { name, sessions: 0 };
        cur.sessions += 1;
        cur.name = name; // display the most-recently-seen casing
        map.set(key, cur);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions);
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
export function buildSetPatch(data, day, dateKey, id, exName, w, r, warm = false) {
  const todaySets = ((day.sets || {})[id] || {})[exName] || [];
  const entry = warm ? { w: w ?? 0, r, warm: true } : { w: w ?? 0, r };
  const sets = { ...(day.sets || {}) };
  sets[id] = { ...(sets[id] || {}) };
  sets[id][exName] = [...todaySets, entry];
  if (warm) return { sets, pr: null }; // warm-ups never PR
  const newE1 = e1rm(w ?? 0, r);
  const workingToday = todaySets.filter((s) => !s.warm);
  const prevBest = Math.max(bestBefore(data, exName, dateKey), ...workingToday.map((s) => e1rm(s.w, s.r)), 0);
  const hadHistory = lastSetsFor(data, id, exName, dateKey) !== null;
  const pr = hadHistory && prevBest > 0 && newE1 > prevBest
    ? { name: exName, w: w ?? 0, r, new: newE1, old: prevBest }
    : null;
  return { sets, pr };
}

// Most recent prior day this exercise was logged, under any strength-day
// bucket (so the "last time" hint follows an exercise across program changes).
export function lastSetsFor(data, id, exName, beforeKey) {
  const target = normName(exName);
  const keys = Object.keys(data.days).filter((k) => k < beforeKey).sort().reverse();
  for (const k of keys) {
    const buckets = data.days[k]?.sets || {};
    for (const bid of Object.keys(buckets)) {
      const bucket = buckets[bid] || {};
      for (const nm of Object.keys(bucket)) {
        if (normName(nm) !== target) continue;
        const working = (bucket[nm] || []).filter((x) => !x.warm);
        if (working.length) return { k, sets: working };
      }
    }
  }
  return null;
}
