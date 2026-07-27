// Double-progression coaching for the PPL lifts. In a deficit the job is to
// RETAIN muscle, so we bias toward earned load increases and reps-in-reserve,
// flag stalls, and prescribe a deload rather than grinding. Pure + testable.
import { movementOf } from "./exercises.js";
import { e1rm } from "./util.js";

// Parse a rep target from a scheme string: "3 × 8–12" → [8,12], "3 × 15" → [12,15].
export function repRange(scheme) {
  const r = (scheme || "").match(/(\d+)\s*[–—-]\s*(\d+)/);
  if (r) return [parseInt(r[1], 10), parseInt(r[2], 10)];
  const one = (scheme || "").match(/×\s*(\d+)/);
  if (one) { const n = parseInt(one[1], 10); return [Math.max(1, n - 3), n]; }
  return [8, 12];
}

// Big lower-body compounds jump 10 lb; everything else 5.
const LOWER = new Set(["squat", "hinge", "lunge", "calves"]);
export const loadIncrement = (exName) => (LOWER.has(movementOf(exName)) ? 10 : 5);

// Per-session summary for an exercise across all day buckets, warm-ups excluded.
export function sessionSummaries(data, exName) {
  const out = [];
  for (const [k, day] of Object.entries(data.days || {})) {
    const sets = [];
    for (const id of Object.keys(day?.sets || {})) {
      const s = day.sets[id]?.[exName];
      if (s) sets.push(...s.filter((x) => !x.warm));
    }
    if (!sets.length) continue;
    out.push({
      k,
      best: Math.max(0, ...sets.map((s) => e1rm(s.w, s.r))),
      maxReps: Math.max(...sets.map((s) => s.r)),
      topW: Math.max(0, ...sets.map((s) => s.w || 0)),
      minRepAtTop: (() => {
        const tw = Math.max(0, ...sets.map((s) => s.w || 0));
        const at = sets.filter((s) => (s.w || 0) >= tw);
        return Math.min(...at.map((s) => s.r));
      })(),
    });
  }
  return out.sort((a, b) => (a.k < b.k ? -1 : 1));
}

// The prescription for the NEXT set of this exercise, from its history.
export function progressionAdvice(data, exName, dateKey, scheme) {
  const [lo, hi] = repRange(scheme);
  const inc = loadIncrement(exName);
  const hist = sessionSummaries(data, exName).filter((h) => h.k < dateKey);
  const last = hist[hist.length - 1];

  if (!last) {
    return { range: [lo, hi], status: "start", tone: "dim", inc,
      msg: `Start light — a weight you can do ${lo} clean reps with, ~2 in reserve.` };
  }

  const loaded = last.topW > 0;
  const allHitTop = last.minRepAtTop >= hi;

  if (allHitTop) {
    return loaded
      ? { range: [lo, hi], status: "add-weight", tone: "good", inc, topW: last.topW,
          msg: `You hit ${hi} on every set at ${last.topW} lb — add ${inc} lb next time, back to ${lo} reps.` }
      : { range: [lo, hi], status: "add-load", tone: "good", inc,
          msg: `You're past ${hi} reps everywhere — add a vest/DB or a harder variation.` };
  }

  // Stall: over the last 3 sessions the progression metric hasn't moved.
  const metric = (h) => (loaded ? h.best : h.maxReps);
  const stalled = hist.length >= 3 && metric(last) <= metric(hist[hist.length - 3]) + (loaded ? 0.5 : 0);
  if (stalled) {
    return loaded
      ? { range: [lo, hi], status: "deload", tone: "warn", inc, topW: last.topW,
          msg: `Stalled ~3 sessions. Deload to ${Math.round((last.topW * 0.9) / 5) * 5} lb and rebuild, or just hold and maintain — normal on a cut.` }
      : { range: [lo, hi], status: "deload", tone: "warn", inc,
          msg: `Reps stuck ~3 sessions. Drop to an easier variation and rebuild, or hold and maintain.` };
  }

  return loaded
    ? { range: [lo, hi], status: "add-reps", tone: "fuel", inc, topW: last.topW,
        msg: `Add a rep — last top set ${last.topW}×${last.minRepAtTop}, aim for ${hi}. Keep ~2 in reserve.` }
    : { range: [lo, hi], status: "add-reps", tone: "fuel", inc,
        msg: `Add a rep — last ${last.maxReps}, aim for ${hi}. Keep ~2 in reserve.` };
}
