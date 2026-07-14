import { keyOffset, weekKeys, keyPlus } from "./dates.js";
import { netOf, num, proteinOf, hasAnyLog } from "./util.js";
import { weekPullupDays, weekPullupReps, pullupStarted } from "./pullups.js";

export function weekStatsFor(data, dateKey) {
  const wk = weekKeys(dateKey);
  let runs = 0, strength = 0, deficit = 0, logged = 0;
  wk.forEach((k) => {
    const dd = data.days[k];
    if (!dd) return;
    if (dd.activities?.includes("run")) runs++;
    if (dd.activities?.includes("A")) strength++;
    if (dd.activities?.includes("B")) strength++;
    const n = netOf(dd);
    if (n !== null) { deficit += -n; logged++; }
  });
  return { runs, strength, deficit, logged };
}

const avgWeightWindow = (data, from, to) => {
  const vals = [];
  for (let i = from; i <= to; i++) {
    const dd = data.days[keyOffset(-i)];
    const v = dd ? num(dd.weight) : null;
    if (v !== null) vals.push(v);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

// The weekly coach verdict, judged entirely against editable goals.
export function coachVerdict(data, dateKey) {
  const g = data.goals;
  const weekStats = weekStatsFor(data, dateKey);
  const sessionTarget = g.weeklyRuns + g.weeklyStrength;
  const sessions = weekStats.runs + weekStats.strength;
  const deficitTarget = Math.max(1, weekStats.logged) * g.deficit;

  const wNow = avgWeightWindow(data, 0, 6);
  const wPrev = avgWeightWindow(data, 7, 13);
  const lossRate = wNow !== null && wPrev !== null ? wPrev - wNow : null; // lbs/week
  const lossPct = lossRate !== null && wPrev ? (lossRate / wPrev) * 100 : null;

  const last7 = Array.from({ length: 7 }, (_, i) => data.days[keyOffset(i - 6)]);
  const protVals = last7.map((d) => (d ? proteinOf(d) : 0)).filter((v) => v > 0);
  const avgProt = protVals.length ? protVals.reduce((a, b) => a + b, 0) / protVals.length : null;

  let headline, tone;
  if (lossPct !== null && lossPct > g.maxLossPct) {
    headline = `Losing ${lossRate.toFixed(1)} lb/wk — too fast. Eat ~200 kcal more per day or you'll burn muscle with the fat.`;
    tone = "bad";
  } else if (lossRate !== null && lossRate < 0.2 && weekStats.logged >= 4 && weekStats.deficit >= g.deficit * 4) {
    headline = "Scale flat despite a real deficit. Hold one more week (water noise), then trim 100–150 kcal/day if still stuck.";
    tone = "warn";
  } else if (sessions >= sessionTarget && weekStats.deficit >= deficitTarget * 0.8 && (lossRate === null || lossRate >= 0.2)) {
    headline = "On pace. Change nothing — consistency is the whole program.";
    tone = "good";
  } else if (weekStats.logged < 3 && sessions < 2) {
    headline = "Not enough data this week for a verdict. Log days — even bad ones count.";
    tone = "dim";
  } else {
    headline = "Partial week. Close the gaps below and the verdict improves.";
    tone = "warn";
  }

  const lines = [
    { ok: sessions >= sessionTarget, txt: `Training: ${weekStats.runs}/${g.weeklyRuns} runs · ${weekStats.strength}/${g.weeklyStrength} strength` },
    { ok: weekStats.deficit >= deficitTarget * 0.8, txt: `Deficit: ${weekStats.deficit >= 0 ? "−" : "+"}${Math.abs(Math.round(weekStats.deficit)).toLocaleString()} kcal over ${weekStats.logged} logged day${weekStats.logged === 1 ? "" : "s"} (goal −${deficitTarget.toLocaleString()})` },
    { ok: avgProt !== null && avgProt >= g.protein - 10, txt: avgProt === null ? "Protein: not logged yet" : `Protein: ${Math.round(avgProt)}g/day average (goal ${g.protein}+)` },
    { ok: lossRate !== null && lossRate >= 0.2 && (lossPct === null || lossPct <= g.maxLossPct), txt: lossRate === null ? "Weight: need weigh-ins in both of the last two weeks" : `Weight: ${lossRate >= 0 ? "−" : "+"}${Math.abs(lossRate).toFixed(1)} lb vs last week's average` },
  ];

  const pullDays = weekPullupDays(data, dateKey);
  const pullReps = weekPullupReps(data, dateKey);
  lines.push({
    ok: pullDays >= g.pullupDays,
    txt: pullupStarted(data) || pullDays > 0
      ? `Pull-ups: ${pullDays}/${g.pullupDays} days · ${pullReps} reps this week`
      : "Pull-ups: not started — log a max test in the Today card to begin",
  });

  return { headline, tone, lines, weekStats, lossRate, lossPct, avgProt, sessions, sessionTarget };
}

// "What should I train today?" — the week's gaps + the 48h run rule + A/B
// alternation, condensed to one suggestion. Null once today has activities.
export function suggestTraining(data, dateKey) {
  const g = data.goals;
  const today = data.days[dateKey];
  if (today && (today.activities || []).length > 0) return null;

  const s = weekStatsFor(data, dateKey);
  const runsLeft = Math.max(0, g.weeklyRuns - s.runs);
  const strengthLeft = Math.max(0, g.weeklyStrength - s.strength);

  const daysSince = (pred) => {
    for (let d = 1; d <= 30; d++) {
      const dd = data.days[keyPlus(dateKey, -d)];
      if (dd && pred(dd)) return d;
    }
    return null;
  };
  const sinceRun = daysSince((d) => (d.activities || []).includes("run"));
  const sinceA = daysSince((d) => (d.activities || []).includes("A"));
  const sinceB = daysSince((d) => (d.activities || []).includes("B"));
  const ago = (n, label) => (n === null ? `no ${label} yet` : n === 1 ? `${label} yesterday` : `${label} ${n}d ago`);

  if (runsLeft === 0 && strengthLeft === 0) {
    return { act: null, label: "Week complete", why: `${s.runs}/${g.weeklyRuns} runs · ${s.strength}/${g.weeklyStrength} strength — rest, walk, easy pull-ups` };
  }
  const runOk = sinceRun === null || sinceRun >= 2;
  if (runsLeft > 0 && (runOk || strengthLeft === 0)) {
    if (runOk) {
      return { act: "run", label: `Run · Week ${data.runWeek}`, why: `${runsLeft} run${runsLeft === 1 ? "" : "s"} left this week · ${ago(sinceRun, "last run")}` };
    }
    return { act: null, label: "Rest day", why: "ran yesterday and strength is done — tendons want the 48h" };
  }
  if (strengthLeft > 0) {
    // alternate: pick the one done longer ago (never-done counts as longest)
    const pick = (sinceA ?? 99) >= (sinceB ?? 99) ? "A" : "B";
    return { act: pick, label: `Strength ${pick}`, why: `${ago(pick === "A" ? sinceA : sinceB, pick)} · ${ago(sinceRun, "last run")}` };
  }
  return null;
}

// Heatmap day classification: 2 = trained, 1 = logged something, 0 = empty.
export function heatLevel(d) {
  if (!d) return 0;
  if ((d.activities || []).length > 0) return 2;
  return hasAnyLog(d) || (d.pullups?.sets || []).length > 0 ? 1 : 0;
}

// Consecutive days with any log, ending today (a not-yet-logged today doesn't break it).
export function logStreak(data) {
  let streak = 0;
  for (let d = hasAnyLog(data.days[keyOffset(0)]) ? 0 : 1; d < 3650; d++) {
    if (hasAnyLog(data.days[keyOffset(-d)])) streak++;
    else break;
  }
  return streak;
}

// Consecutive completed Monday-weeks (before the current one) hitting both weekly targets.
export function fullWeekStreak(data, dateKey) {
  const g = data.goals;
  let streak = 0;
  let probe = weekKeys(dateKey)[0]; // Monday of current week
  for (let w = 0; w < 520; w++) {
    probe = keyPlus(probe, -7);
    const s = weekStatsFor(data, probe);
    if (s.runs >= g.weeklyRuns && s.strength >= g.weeklyStrength) streak++;
    else break;
  }
  return streak;
}
