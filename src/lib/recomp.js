// The Recomp Check: the scale can't judge body recomposition, but waist (fat
// proxy) + weight + strength (lean-mass proxy) together can. Cross the three
// trends and say the thing a good coach would.
import { keyOffset } from "./dates.js";
import { num, e1rm } from "./util.js";
import { testHistory } from "./pullups.js";

const WINDOW = 42; // six weeks of signal

const avgWeight = (data, from, to) => {
  const vals = [];
  for (let i = from; i <= to; i++) {
    const v = num(data.days[keyOffset(-i)]?.weight);
    if (v !== null) vals.push(v);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

// Waist: sparse by design — latest reading vs one at least 14 days older.
function waistTrend(data) {
  const pts = [];
  for (let i = 0; i < 120; i++) {
    const k = keyOffset(-i);
    const v = num(data.days[k]?.measurements?.waist);
    if (v !== null) pts.push({ daysAgo: i, v });
  }
  if (pts.length < 2 || pts[0].daysAgo > 28) return null;
  const latest = pts[0];
  const prev = pts.find((p) => p.daysAgo - latest.daysAgo >= 14);
  if (!prev) return null;
  return { delta: latest.v - prev.v, spanDays: prev.daysAgo - latest.daysAgo, latest: latest.v };
}

// Strength: average % change of best-session e1RM, second half of the window
// vs the first, across every lifted exercise present in both halves. Falls
// back to pull-up max tests when no loaded lifts qualify.
function strengthTrend(data) {
  const half = WINDOW / 2;
  const byExercise = {};
  for (let i = 0; i < WINDOW; i++) {
    const d = data.days[keyOffset(-i)];
    if (!d?.sets) continue;
    const bucket = i < half ? "recent" : "earlier";
    for (const byName of Object.values(d.sets)) {
      for (const [name, sets] of Object.entries(byName)) {
        const best = Math.max(0, ...sets.map((s) => e1rm(s.w, s.r)));
        if (best <= 0) continue;
        byExercise[name] = byExercise[name] || { recent: 0, earlier: 0 };
        byExercise[name][bucket] = Math.max(byExercise[name][bucket], best);
      }
    }
  }
  const pcts = Object.values(byExercise)
    .filter((x) => x.recent > 0 && x.earlier > 0)
    .map((x) => ((x.recent - x.earlier) / x.earlier) * 100);
  if (pcts.length) {
    return { pct: pcts.reduce((a, b) => a + b, 0) / pcts.length, n: pcts.length, source: "lifts" };
  }
  // pull-up fallback: latest max vs a max 14+ days older (any grip, matched)
  const tests = testHistory(data);
  if (tests.length >= 2) {
    const latest = tests[tests.length - 1];
    const prior = [...tests].reverse().find((t) => t.grip === latest.grip && t.k < latest.k);
    if (prior && prior.reps > 0) {
      return { pct: ((latest.reps - prior.reps) / prior.reps) * 100, n: 1, source: "pull-ups" };
    }
  }
  return null;
}

export function recompCheck(data) {
  const wNow = avgWeight(data, 0, 13);
  const wPrev = avgWeight(data, 14, 27);
  const weight = wNow !== null && wPrev !== null ? { delta: wNow - wPrev } : null;
  const waist = waistTrend(data);
  const strength = strengthTrend(data);

  const missing = [];
  if (!weight) missing.push("weigh-ins across the last 4 weeks");
  if (!waist) missing.push("two waist measurements 14+ days apart (latest within 4 weeks)");
  if (!strength) missing.push("the same lifts (or pull-up tests) logged 3+ weeks apart");
  if (missing.length) return { ready: false, missing, weight, waist, strength };

  const weightDown = weight.delta <= -0.4;           // ≥ ~0.2 lb/wk
  const waistDown = waist.delta <= -0.2;             // real tape movement
  const waistUp = waist.delta >= 0.4;
  const strengthDown = strength.pct <= -2;
  const strengthUp = strength.pct >= 1;

  let tone, headline, advice;
  if (waistDown && !strengthDown) {
    tone = "good";
    headline = weightDown ? "Recomp working: fat down, muscle holding." : "Textbook recomp: waist down, strength up, scale asleep.";
    advice = weightDown ? "Change nothing." : "Ignore the scale — the tape and the bar say it's working. Change nothing.";
  } else if (strengthDown && (weightDown || !waistDown)) {
    tone = "bad";
    headline = "Muscle-loss risk: strength is sliding.";
    advice = "Eat at the top of your protein goal, add ~150 kcal/day for a week, and keep every lift heavy — the deficit is winning against the wrong tissue.";
  } else if (!weightDown && !waistDown && strengthUp) {
    tone = "warn";
    headline = "Getting stronger, but not leaner.";
    advice = "Strength is climbing but fat isn't moving — check the deficit adherence line on the verdict.";
  } else if (waistUp) {
    tone = "warn";
    headline = "Waist creeping up.";
    advice = "Re-check calories in — measurement error is possible, so confirm with next week's tape before changing anything.";
  } else {
    tone = "dim";
    headline = "Signals mixed — hold course another two weeks.";
    advice = "Nothing is clearly wrong. Keep logging; the trends will separate.";
  }

  return {
    ready: true, tone, headline, advice,
    lines: [
      { ok: weightDown, txt: `Weight: ${weight.delta <= 0 ? "" : "+"}${weight.delta.toFixed(1)} lb (14d avg vs prior 14d)` },
      { ok: waistDown, txt: `Waist: ${waist.delta <= 0 ? "" : "+"}${waist.delta.toFixed(1)}" over ${waist.spanDays}d (now ${waist.latest}")` },
      { ok: !strengthDown, txt: `Strength: ${strength.pct >= 0 ? "+" : ""}${strength.pct.toFixed(1)}% e1RM across ${strength.n} ${strength.source === "lifts" ? `lift${strength.n === 1 ? "" : "s"}` : "pull-up max"}` },
    ],
  };
}
