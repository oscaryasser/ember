// Node unit tests for the pure logic. Run with: npm test
import assert from "node:assert/strict";
import { buildRunSegments, buildCustomSegments, totalSecs, RUN_WEEKS } from "../src/plan.js";
import { buildStrength, substitutesFor, sessionList, movementOf, PROGRAM } from "../src/lib/exercises.js";
import { plateBreakdown, warmupRamp } from "../src/lib/plates.js";
import { recompCheck } from "../src/lib/recomp.js";
import { adaptationCheck, gapSuggestions } from "../src/lib/adaptive.js";
import { buildCoachBrief } from "../src/lib/brief.js";
import { normalizeImport, summarizeImport, mergeImport } from "../src/lib/importExport.js";
import { num, netOf, proteinOf, e1rm, sanitizeDay, safeParse, pickFresher, intakeOf, mealTotals, sleepTotalOf } from "../src/lib/util.js";
import { estimateTDEE, resolveTargets, weightSlope, kcalFromMacros } from "../src/lib/adaptive.js";
import { weekStatsFor, coachVerdict, logStreak, fullWeekStreak, suggestTraining, heatLevel } from "../src/lib/coach.js";
import { todayKey, keyOffset, keyPlus, weekKeys } from "../src/lib/dates.js";
import {
  suggestedGrip, prescription, workingMax, bestTestBefore, testDue,
  weekPullupDays, weekPullupReps, pullupVolume, GRIP_ORDER,
} from "../src/lib/pullups.js";

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log("  ✓", name); }
  catch (e) { console.error("  ✗", name, "\n   ", e.message); process.exitCode = 1; }
};

console.log("run segments");
test("week 1: warmup + 8 jogs + 7 walks + cooldown, ~29 min", () => {
  const segs = buildRunSegments(1);
  assert.equal(segs.filter((s) => s.type === "jog").length, 8);
  assert.equal(segs.filter((s) => s.type === "walk").length, 7);
  assert.equal(segs[0].type, "warmup");
  assert.equal(segs[segs.length - 1].type, "cool");
  assert.equal(totalSecs(segs), 300 + 8 * 60 + 7 * 120 + 300); // 1920s = 32 min incl. cooldown
});
test("week 5: 5×(3min jog / 90s walk)", () => {
  const segs = buildRunSegments(5);
  assert.equal(segs.filter((s) => s.type === "jog").length, 5);
  assert.equal(segs.filter((s) => s.type === "walk").length, 4);
  assert.equal(totalSecs(segs), 300 + 5 * 180 + 4 * 90 + 300);
});
test("week 8: jog/walk/jog blocks", () => {
  const segs = buildRunSegments(8);
  assert.deepEqual(segs.map((s) => s.type), ["warmup", "jog", "walk", "jog", "cool"]);
  assert.equal(totalSecs(segs), 300 + 480 + 300 + 480 + 300);
});
test("week 9 variants: 20 and 25 min", () => {
  assert.equal(totalSecs(buildRunSegments(9, 0)), 300 + 1200 + 300);
  assert.equal(totalSecs(buildRunSegments(9, 1)), 300 + 1500 + 300);
});
test("week 10: 30 min continuous", () => {
  const segs = buildRunSegments(10);
  assert.equal(segs.length, 3);
  assert.equal(segs[1].secs, 1800);
});
test("all 10 weeks build non-empty segment lists", () => {
  for (const w of Object.keys(RUN_WEEKS)) assert.ok(buildRunSegments(Number(w)).length >= 3, `week ${w}`);
});

console.log("legacy day math (parity with old artifact)");
const legacyDay = {
  activities: ["run", "A"], runWeek: 3,
  checks: { run: true, A: [true, true, false, true] },
  calIn: "1950", calActive: "480", calResting: "1710",
  mins: "42", protein: "35", proteinEntries: [40, 30, 20],
  weight: "212.4", steps: "9100", sleepScore: "82", sleepHours: "7.2",
  sets: { A: { "Leg press or goblet squat": [{ w: 180, r: 10 }, { w: 180, r: 12 }] } },
  modeA: "gym",
};
test("netOf matches legacy formula", () => assert.equal(netOf(legacyDay), 1950 - (480 + 1710)));
test("proteinOf sums legacy field + entries", () => assert.equal(proteinOf(legacyDay), 35 + 90));
test("num handles blanks", () => { assert.equal(num(""), null); assert.equal(num("12.5"), 12.5); });
test("e1rm epley", () => assert.equal(e1rm(180, 12), 180 * (1 + 12 / 30)));
test("sleepTotalOf sums overnight + naps, null when neither", () => {
  assert.equal(sleepTotalOf({ sleepHours: "6.5", napHours: "1.5" }), 8);
  assert.equal(sleepTotalOf({ sleepHours: "7" }), 7);
  assert.equal(sleepTotalOf({ napHours: "0.5" }), 0.5); // nap-only day still counts
  assert.equal(sleepTotalOf({ sleepHours: "", napHours: "" }), null);
  assert.equal(sleepTotalOf(undefined), null);
});

console.log("import normalizer — every plausible wrapper");
const legacyData = {
  days: { "2026-06-01": legacyDay, "2026-06-03": { ...legacyDay, activities: ["B"], weight: "211.0" } },
  runWeek: 3,
  custom: { A: { home: [], gym: ["Face pulls — 3 × 15"] }, B: { home: [], gym: [] } },
  runAck: { 2: 2 },
  targetWeight: "185",
  theme: "dark",
};
const rawJSON = JSON.stringify(legacyData);
test("raw data object", () => assert.equal(normalizeImport(rawJSON).runWeek, 3));
test("kv pair {key, value:string}", () => {
  const j = normalizeImport(JSON.stringify({ key: "recomp:data", value: rawJSON }));
  assert.equal(Object.keys(j.days).length, 2);
});
test("kv pair {key, value:object}", () => {
  const j = normalizeImport(JSON.stringify({ key: "recomp:data", value: legacyData }));
  assert.equal(j.targetWeight, "185");
});
test("keyed map {'recomp:data': string}", () => {
  const j = normalizeImport(JSON.stringify({ "recomp:data": rawJSON }));
  assert.equal(j.runWeek, 3);
});
test("double-encoded string", () => {
  const j = normalizeImport(JSON.stringify(rawJSON));
  assert.equal(j.runWeek, 3);
});
test("ember export round-trip", () => {
  const j = normalizeImport(JSON.stringify({ app: "ember", version: 1, data: legacyData }));
  assert.equal(j.runWeek, 3);
});
test("garbage rejected with clear error", () => {
  assert.throws(() => normalizeImport("not json"), /valid JSON/);
  assert.throws(() => normalizeImport(JSON.stringify({ foo: 1 })), /days/);
});

console.log("import merge");
test("summary counts logged days", () => {
  const s = summarizeImport(legacyData);
  assert.equal(s.dayCount, 2);
  assert.equal(s.first, "2026-06-01");
});
test("merge: imported days win, goals inherit targetWeight, custom union", () => {
  const current = {
    days: { "2026-07-01": { ...legacyDay, weight: "209" } },
    runWeek: 1, runAck: {}, custom: { A: { home: ["X — 3 × 10"], gym: [] }, B: { home: [], gym: [] } },
    goals: { protein: 160, targetWeight: "" },
  };
  const m = mergeImport(current, legacyData);
  assert.equal(Object.keys(m.days).length, 3);
  assert.equal(m.runWeek, 3);
  assert.equal(m.goals.targetWeight, "185");
  assert.deepEqual(m.custom.A.home, ["X — 3 × 10"]);
  assert.deepEqual(m.custom.A.gym, ["Face pulls — 3 × 15"]);
  // legacy day content preserved verbatim
  assert.equal(proteinOf(m.days["2026-06-01"]), 125);
  assert.equal(m.days["2026-06-01"].sets.A["Leg press or goblet squat"].length, 2);
});

console.log("coach verdicts and streaks");
// Goals mirror DEFAULT_GOALS (store.jsx is JSX and can't load in node).
const GOALS = { protein: 160, deficit: 500, steps: 8000, sleepHours: 7, targetWeight: "", weeklyRuns: 2, weeklyStrength: 2, maxLossPct: 1.5, restSecs: 90, pullupDays: 5, pullupTarget: 10 };
const deficitDay = (extra = {}) => ({ activities: [], checks: {}, calIn: "1700", calActive: "400", calResting: "1800", ...extra }); // −500 net
// Weight windows and last-7 protein read relative to the REAL today, so those
// fixtures are built with keyOffset; session weeks use a fixed Monday week.
const fixedWeek = weekKeys("2026-06-03"); // any stable Mon–Sun
const weightsAround = (nowLbs, prevLbs) => {
  const days = {};
  for (let i = 0; i <= 6; i++) days[keyOffset(-i)] = { weight: String(nowLbs) };
  for (let i = 7; i <= 13; i++) days[keyOffset(-i)] = { weight: String(prevLbs) };
  return days;
};

test("weekStatsFor counts runs, strength, deficit, logged in the Monday week", () => {
  const days = {};
  days[fixedWeek[0]] = deficitDay({ activities: ["run"] });
  days[fixedWeek[1]] = deficitDay({ activities: ["A"] });
  days[fixedWeek[3]] = deficitDay({ activities: ["B", "run"] });
  days[fixedWeek[5]] = deficitDay();
  days[keyPlus(fixedWeek[0], -1)] = deficitDay({ activities: ["run"] }); // previous week — excluded
  const s = weekStatsFor({ days }, fixedWeek[2]);
  assert.deepEqual(s, { runs: 2, strength: 2, deficit: 2000, logged: 4 });
});

test("verdict: losing too fast → bad, tells you to eat more", () => {
  const v = coachVerdict({ days: weightsAround(200, 205), goals: GOALS }, todayKey());
  assert.equal(v.tone, "bad");
  assert.match(v.headline, /too fast/);
});

test("verdict: real deficit but flat scale → stall warning", () => {
  const days = weightsAround(210, 210);
  // 4 logged deficit days + sessions in the current Monday week (today is always in it)
  const wk = weekKeys(todayKey());
  for (let i = 0; i < 4; i++) days[wk[i]] = { ...deficitDay(), ...(days[wk[i]] || {}), ...deficitDay() };
  const v = coachVerdict({ days, goals: GOALS }, todayKey());
  assert.equal(v.tone, "warn");
  assert.match(v.headline, /Scale flat/);
});

test("verdict: sessions + deficit + sane loss rate → on pace", () => {
  const days = weightsAround(209, 210);
  const wk = weekKeys(todayKey());
  days[wk[0]] = { ...(days[wk[0]] || {}), ...deficitDay({ activities: ["run", "A"] }) };
  days[wk[1]] = { ...(days[wk[1]] || {}), ...deficitDay({ activities: ["run", "B"] }) };
  days[wk[2]] = { ...(days[wk[2]] || {}), ...deficitDay() };
  days[wk[3]] = { ...(days[wk[3]] || {}), ...deficitDay() };
  const v = coachVerdict({ days, goals: GOALS }, todayKey());
  assert.equal(v.tone, "good");
  assert.match(v.headline, /On pace/);
});

test("verdict: empty log → not enough data", () => {
  const v = coachVerdict({ days: {}, goals: GOALS }, todayKey());
  assert.equal(v.tone, "dim");
});

test("verdict lines are judged against editable goals", () => {
  const days = {};
  for (let i = 0; i <= 6; i++) days[keyOffset(-i)] = { proteinEntries: [175] }; // ok has a 10g tolerance
  const v160 = coachVerdict({ days, goals: GOALS }, todayKey());
  const v190 = coachVerdict({ days, goals: { ...GOALS, protein: 190 } }, todayKey());
  const line = (v) => v.lines.find((l) => l.txt.startsWith("Protein"));
  assert.equal(line(v160).ok, true);
  assert.equal(line(v190).ok, false);
  assert.match(line(v190).txt, /goal 190\+/);
  assert.match(v190.lines[4].txt, /Pull-ups: 0\/5 days|not started/);
});

test("logStreak: counts back from today, unlogged today doesn't break it", () => {
  assert.equal(logStreak({ days: {} }), 0);
  const logged = { weight: "210" };
  const d3 = { days: { [keyOffset(0)]: logged, [keyOffset(-1)]: logged, [keyOffset(-2)]: logged } };
  assert.equal(logStreak(d3), 3);
  const graced = { days: { [keyOffset(-1)]: logged, [keyOffset(-2)]: logged } };
  assert.equal(logStreak(graced), 2);
  const gapped = { days: { [keyOffset(0)]: logged, [keyOffset(-2)]: logged } };
  assert.equal(logStreak(gapped), 1);
});

test("fullWeekStreak: consecutive completed 2+2 weeks before this one", () => {
  const days = {};
  const mon = weekKeys(todayKey())[0];
  for (const back of [7, 14]) {
    const m = keyPlus(mon, -back);
    days[m] = { activities: ["run", "A"] };
    days[keyPlus(m, 2)] = { activities: ["run", "B"] };
  }
  assert.equal(fullWeekStreak({ days, goals: GOALS }, todayKey()), 2);
  delete days[keyPlus(mon, -14)];
  assert.equal(fullWeekStreak({ days, goals: GOALS }, todayKey()), 1);
});

console.log("custom runs + gym math");
test("custom intervals: reps with recovery walks + bookends", () => {
  const segs = buildCustomSegments({ kind: "intervals", reps: 4, jogMins: 2, walkMins: 1 });
  assert.equal(segs.filter((s) => s.type === "jog").length, 4);
  assert.equal(segs.filter((s) => s.type === "walk").length, 3);
  assert.equal(totalSecs(segs), 300 + 4 * 120 + 3 * 60 + 300);
});
test("free run: single continuous block", () => {
  const segs = buildCustomSegments({ kind: "free", mins: 35 });
  assert.deepEqual(segs.map((s) => s.type), ["warmup", "jog", "cool"]);
  assert.equal(segs[1].secs, 2100);
});
test("plate breakdown: greedy per-side, rounds down when unloadable", () => {
  assert.deepEqual(plateBreakdown(185).perSide, [45, 25]);
  assert.equal(plateBreakdown(185).achieved, 185);
  assert.deepEqual(plateBreakdown(137).perSide, [45, 1].slice(0, 1)); // (137−45)/2 = 46 → one 45, rest unloadable
  assert.equal(plateBreakdown(137).achieved, 135);
  assert.equal(plateBreakdown(40), null); // below the bar
});
test("warm-up ramp: bar → 50% → 70%, rounded to 5s", () => {
  const ramp = warmupRamp(200);
  assert.deepEqual(ramp.map((s) => s.w), [45, 100, 140]);
  assert.equal(warmupRamp(50).length, 1); // too light to ramp
});

console.log("exercise catalog (push/pull/legs) + swaps");
test("buildStrength: 3-day PPL, 5 exercises each, scheme suffix", () => {
  const S = buildStrength();
  assert.deepEqual(Object.keys(S), ["P", "U", "L"]);
  assert.equal(S.P.gym.length, 5);
  assert.equal(S.L.home.length, 5);
  assert.match(S.P.name, /Push/);
  assert.match(S.U.name, /Pull/);
  assert.match(S.L.name, /Legs/);
  assert.ok(S.P.gym[0].includes("—"), "has scheme suffix");
  assert.equal(PROGRAM.L.movements[0], "squat");
  assert.equal(PROGRAM.P.movements[0], "horizPush");
});
test("substitutesFor: up to 5 same-pattern, same-equipment alternatives", () => {
  const subs = substitutesFor("Leg press", "gym");
  assert.ok(subs.length >= 3 && subs.length <= 5);
  assert.ok(!subs.some((s) => s.startsWith("Leg press")), "excludes itself");
  assert.ok(subs.every((s) => s.includes("—")));
  assert.ok(substitutesFor("Chest press machine", "gym").some((s) => s.startsWith("Dumbbell bench")));
  assert.equal(substitutesFor("Not a real exercise", "gym").length, 0);
});
test("new movements resolve: incline, lateral, hammer, lunge, calves", () => {
  assert.equal(movementOf("Incline dumbbell press"), "inclinePush");
  assert.equal(movementOf("Dumbbell lateral raise"), "lateralRaise");
  assert.equal(movementOf("Hammer curl"), "hammer");
  assert.equal(movementOf("Walking lunge"), "lunge");
  assert.equal(movementOf("Standing calf raise"), "calves");
});
test("sessionList applies per-day swaps by index", () => {
  const S = buildStrength();
  const day = { swaps: { L: { 0: "Hack squat — 3 × 8–12" } } };
  const list = sessionList(S, day, "L", "gym");
  assert.ok(list[0].startsWith("Hack squat"));
  assert.equal(list[1], S.L.gym[1]); // untouched
  assert.deepEqual(sessionList(S, {}, "L", "gym"), S.L.gym); // no swaps → defaults
});

console.log("scheduled suggestion");
test("planned session for today overrides the inferred suggestion", () => {
  const withPlan = (act) => ({ days: {}, goals: GOALS, runWeek: 4, schedule: { [todayKey()]: act } });
  assert.equal(suggestTraining(withPlan("P"), todayKey()).act, "P");
  assert.equal(suggestTraining(withPlan("L"), todayKey()).label, "Legs");
  assert.equal(suggestTraining(withPlan("run"), todayKey()).act, "run");
  assert.match(suggestTraining(withPlan("U"), todayKey()).why, /plan/i);
  const logged = { days: { [todayKey()]: { activities: ["run"] } }, goals: GOALS, runWeek: 4, schedule: { [todayKey()]: "P" } };
  assert.equal(suggestTraining(logged, todayKey()), null);
});
test("legacy A/B activities still count as strength for old logs", () => {
  const wk = weekKeys(todayKey());
  const days = { [wk[0]]: { activities: ["A"] }, [wk[1]]: { activities: ["B"] } };
  assert.equal(weekStatsFor({ days }, todayKey()).strength, 2);
});

console.log("recomp check");
const recompFixture = ({ waistNow, waistPrev, wRecent, wEarlier, liftRecent, liftEarlier }) => {
  const days = {};
  for (let i = 0; i <= 13; i++) days[keyOffset(-i)] = { weight: String(wRecent) };
  for (let i = 14; i <= 27; i++) days[keyOffset(-i)] = { weight: String(wEarlier) };
  days[keyOffset(-2)] = { ...days[keyOffset(-2)], measurements: { waist: String(waistNow) } };
  days[keyOffset(-20)] = { ...days[keyOffset(-20)], measurements: { waist: String(waistPrev) } };
  days[keyOffset(-3)] = { ...days[keyOffset(-3)], sets: { A: { "Leg press": [{ w: liftRecent, r: 10 }] } } };
  days[keyOffset(-30)] = { sets: { A: { "Leg press": [{ w: liftEarlier, r: 10 }] } } };
  return { days, goals: GOALS };
};
test("recomp check: waist down + strength up + scale asleep → textbook recomp", () => {
  const rc = recompCheck(recompFixture({ waistNow: 36.0, waistPrev: 36.5, wRecent: 210, wEarlier: 210, liftRecent: 200, liftEarlier: 190 }));
  assert.equal(rc.ready, true);
  assert.equal(rc.tone, "good");
  assert.match(rc.headline, /Textbook recomp/);
});
test("recomp check: weight down but strength sliding → muscle-loss warning", () => {
  const rc = recompCheck(recompFixture({ waistNow: 36.5, waistPrev: 36.5, wRecent: 208, wEarlier: 210, liftRecent: 180, liftEarlier: 200 }));
  assert.equal(rc.tone, "bad");
  assert.match(rc.headline, /Muscle-loss risk/);
});
test("recomp check: honest about missing data", () => {
  const rc = recompCheck({ days: {}, goals: GOALS });
  assert.equal(rc.ready, false);
  assert.equal(rc.missing.length, 3);
});

console.log("adaptation + gap closer");
test("adaptationCheck flags a measured TDEE drop while still cutting", () => {
  const days = {};
  for (let i = 0; i <= 48; i++) {
    days[keyOffset(-i)] = { calIn: String(i <= 20 ? 2000 : 2400) };
    if (i % 7 === 0) days[keyOffset(-i)].weight = String(205 + 0.1 * i);
  }
  const a = adaptationCheck({ days, goals: GOALS });
  assert.equal(a.flagged, true);
  assert.ok(a.drop >= 250, `drop ${a.drop}`);
});
test("adaptationCheck stays quiet without a real drop", () => {
  const days = {};
  for (let i = 0; i <= 48; i++) {
    days[keyOffset(-i)] = { calIn: "2000" };
    if (i % 7 === 0) days[keyOffset(-i)].weight = String(205 + 0.1 * i);
  }
  assert.equal(adaptationCheck({ days, goals: GOALS }).flagged, false);
});
test("gap closer: densest library foods that fit the calorie budget", () => {
  const data = { foods: [
    { id: "1", name: "Shake", p: 30, kcal: 150 },
    { id: "2", name: "Chicken plate", p: 50, kcal: 400 },
    { id: "3", name: "Rice", p: 4, kcal: 200 },
  ] };
  const g = gapSuggestions(data, {}, { protein: 160, kcal: 2000 }, 1700, 120);
  assert.equal(g.needP, 40);
  assert.equal(g.picks[0].food.name, "Shake");
  assert.equal(g.picks[0].servings, 2);
  assert.ok(!g.picks.some((p) => p.food.name === "Chicken plate")); // 400 kcal doesn't fit 300 budget
  assert.equal(gapSuggestions(data, {}, { protein: 160, kcal: 2000 }, 1700, 158), null); // close enough
});
test("coach brief contains the load-bearing numbers", () => {
  const days = {};
  for (let i = 0; i < 28; i++) {
    days[keyOffset(-i)] = { calIn: "2000", proteinEntries: [160], weight: i % 3 ? "" : String(210 - 0.05 * (28 - i)) };
  }
  const brief = buildCoachBrief({ days, goals: GOALS, runWeek: 4, foods: [] });
  assert.match(brief, /EMBER COACH BRIEF/);
  assert.match(brief, /Measured TDEE/);
  assert.match(brief, /Protein: avg 160g/);
  assert.match(brief, /run plan week 4\/10/);
});

console.log("training suggestion + heatmap");
// Use a mid-week anchor so every relative day stays inside the fixed week.
const anchor = fixedWeek[3]; // Thursday
const sData = (days) => ({ days, goals: GOALS, runWeek: 4 });
test("suggests a run when 48h+ since the last one", () => {
  const days = { [fixedWeek[0]]: { activities: ["P"] }, [fixedWeek[1]]: { activities: ["run"] } }; // run 2d before anchor
  const s = suggestTraining(sData(days), anchor);
  assert.equal(s.act, "run");
  assert.match(s.label, /Week 4/);
});
test("rotates Push → Pull → Legs by longest-ago when run was yesterday", () => {
  // Push done 3d ago, run 1d ago → not a run day, strength left → pick the day trained longest ago (Pull/Legs never → first)
  const days = { [fixedWeek[0]]: { activities: ["P"] }, [fixedWeek[2]]: { activities: ["run"] } };
  const s = suggestTraining(sData(days), anchor);
  assert.equal(s.act, "U"); // P was done, U/L never → U is first of the tied "never"
  assert.equal(s.label, "Pull");
});
test("rest day when ran yesterday and strength is done", () => {
  const days = {
    [fixedWeek[0]]: { activities: ["P"] },
    [fixedWeek[1]]: { activities: ["U"] },
    [fixedWeek[2]]: { activities: ["run"] },
  };
  const s = suggestTraining(sData(days), anchor); // weeklyStrength 2 in GOALS → target met
  assert.equal(s.act, null);
  assert.match(s.label, /Rest/);
});
test("week complete once both targets are hit", () => {
  const days = {
    [fixedWeek[0]]: { activities: ["run", "P"] },
    [fixedWeek[1]]: { activities: ["U"] },
    [fixedWeek[2]]: { activities: ["run"] },
  };
  assert.match(suggestTraining(sData(days), anchor).label, /Week complete/);
});
test("no suggestion once today has activities", () => {
  const days = { [anchor]: { activities: ["run"] } };
  assert.equal(suggestTraining(sData(days), anchor), null);
});
test("heatLevel: trained > logged > empty", () => {
  assert.equal(heatLevel({ activities: ["run"] }), 2);
  assert.equal(heatLevel({ weight: "210" }), 1);
  assert.equal(heatLevel({ pullups: { sets: [{ grip: "chin", reps: 3 }] } }), 1);
  assert.equal(heatLevel({}), 0);
  assert.equal(heatLevel(undefined), 0);
});

console.log("food log");
const mealDay = {
  meals: [
    { name: "Fairlife shake", qty: 1, kcal: 150, p: 30, c: 4, f: 2.5 },
    { name: "Chicken bowl", qty: 1.5, kcal: 675, p: 52.5, c: 60, f: 22.5 },
  ],
};
test("mealTotals sums entries", () => {
  const t = mealTotals(mealDay);
  assert.equal(t.kcal, 825);
  assert.equal(t.p, 82.5);
});
test("intakeOf: typed MFP total overrides the food log", () => {
  assert.equal(intakeOf(mealDay), 825);
  assert.equal(intakeOf({ ...mealDay, calIn: "1900" }), 1900);
  assert.equal(intakeOf({ calIn: "", meals: [] }), null);
  assert.equal(intakeOf(undefined), null);
});
test("netOf works from meals alone", () => {
  assert.equal(netOf({ ...mealDay, calActive: "400", calResting: "1700" }), 825 - 2100);
});
test("proteinOf counts legacy + quick-adds + food log", () => {
  assert.equal(proteinOf({ ...mealDay, protein: "10", proteinEntries: [20] }), 10 + 20 + 82.5);
});
test("kcalFromMacros uses 4/4/9", () => {
  assert.equal(kcalFromMacros(40, 30, 10), 370);
  assert.equal(kcalFromMacros("", "", ""), 0);
});
test("sanitizeDay repairs malformed meals", () => {
  const c = sanitizeDay({ meals: [{ name: 5, qty: "x", kcal: "150", p: "30" }, "junk", null] });
  assert.equal(c.meals.length, 1);
  assert.deepEqual(c.meals[0], { name: "food", qty: 1, kcal: 150, p: 30, c: 0, f: 0 });
});
test("mergeImport unions food libraries by id", () => {
  const cur = { days: {}, runWeek: 1, runAck: {}, custom: {}, goals: GOALS, foods: [{ id: "f1", name: "Old", kcal: 100, p: 10, c: 5, f: 3 }] };
  const m = mergeImport(cur, { days: {}, foods: [{ id: "f1", name: "Old v2", kcal: 110, p: 11, c: 5, f: 3 }, { id: "f2", name: "New", kcal: 200, p: 20, c: 10, f: 8 }] });
  assert.equal(m.foods.length, 2);
  assert.equal(m.foods.find((f) => f.id === "f1").name, "Old v2");
});

console.log("adaptive targets");
const adaptiveDays = () => {
  const days = {};
  for (let i = 0; i < 28; i++) days[keyOffset(-i)] = { calIn: "2000" };
  // perfectly linear −0.1 lb/day across weigh-ins at x = 1, 8, 15, 22
  for (const [i, w] of [[27, 212.0], [20, 211.3], [13, 210.6], [6, 209.9]]) {
    days[keyOffset(-i)] = { ...days[keyOffset(-i)], weight: String(w) };
  }
  return days;
};
test("weightSlope: least squares on sparse weigh-ins", () => {
  const s = weightSlope([{ x: 1, y: 212 }, { x: 8, y: 211.3 }, { x: 15, y: 210.6 }, { x: 22, y: 209.9 }]);
  assert.ok(Math.abs(s - -0.1) < 1e-9, `slope ${s}`);
});
test("estimateTDEE: intake + weight trend → measured burn", () => {
  const est = estimateTDEE({ days: adaptiveDays(), goals: GOALS });
  assert.equal(est.ok, true);
  assert.equal(est.tdee, 2350); // 2000 + 0.1×3500
  assert.equal(est.lbsPerWeek, -0.7);
  assert.equal(est.intakeDays, 28);
});
test("estimateTDEE: refuses to guess without enough data", () => {
  assert.equal(estimateTDEE({ days: {}, goals: GOALS }).ok, false);
  const fewWeights = adaptiveDays();
  for (const k of Object.keys(fewWeights)) delete fewWeights[k].weight;
  assert.match(estimateTDEE({ days: fewWeights, goals: GOALS }).reason, /weigh-ins/);
});
test("resolveTargets: auto chain kcal → fat 30% → carbs remainder", () => {
  const t = resolveTargets({ days: adaptiveDays(), goals: GOALS });
  assert.equal(t.kcal, 1850); // 2350 − 500
  assert.equal(t.fat, 60);    // 30% of 1850 / 9, rounded to 5
  assert.equal(t.carbs, 170); // (1850 − 160×4 − 60×9) / 4, rounded to 5
  assert.equal(t.kcalAuto, true);
});
test("resolveTargets: manual goals always win over adaptive", () => {
  const t = resolveTargets({ days: adaptiveDays(), goals: { ...GOALS, calTarget: "2200", fat: "80" } });
  assert.equal(t.kcal, 2200);
  assert.equal(t.fat, 80);
  assert.equal(t.kcalAuto, false);
  assert.equal(t.source, "manual");
  const cold = resolveTargets({ days: {}, goals: { ...GOALS, calTarget: "2200" } });
  assert.equal(cold.kcal, 2200); // manual target works with zero history
});

test("resolveTargets: Garmin burn is the provisional fallback before TDEE is measurable", () => {
  const days = {};
  for (let i = 0; i < 5; i++) days[keyOffset(-i)] = { calActive: "400", calResting: "1800" }; // burn 2200, no weigh-ins
  const t = resolveTargets({ days, goals: GOALS });
  assert.equal(t.source, "garmin");
  assert.equal(t.kcal, 1700); // 2200 − 500
  assert.equal(t.fat, 55);    // 30% of 1700 / 9 → 56.7 → nearest 5
  assert.equal(t.carbs, 140); // (1700 − 160×4 − 55×9) / 4 = 141.25 → nearest 5
});

test("resolveTargets: measured TDEE beats the Garmin provisional", () => {
  const days = adaptiveDays();
  for (const k of Object.keys(days)) days[k] = { ...days[k], calActive: "500", calResting: "2500" }; // Garmin claims 3000
  const t = resolveTargets({ days, goals: GOALS });
  assert.equal(t.source, "measured");
  assert.equal(t.kcal, 1850); // from measured 2350, not Garmin's 3000
});

test("resolveTargets: nothing to go on → null targets, protein still set", () => {
  const t = resolveTargets({ days: {}, goals: GOALS });
  assert.equal(t.kcal, null);
  assert.equal(t.source, null);
  assert.equal(t.protein, 160);
});

console.log("dual-store rescue path");
test("safeParse: corrupt, empty, and non-object inputs count as absent", () => {
  assert.equal(safeParse('{"days":{}'), null);       // truncated write
  assert.equal(safeParse(""), null);
  assert.equal(safeParse(null), null);
  assert.equal(safeParse('"just a string"'), null);
  assert.deepEqual(safeParse('{"days":{}}'), { days: {} });
});
test("pickFresher: corrupt localStorage never beats the mirror", () => {
  const mirror = { days: { a: 1 }, savedAt: 100 };
  assert.equal(pickFresher(null, mirror), mirror);   // the exact data-loss scenario
  assert.equal(pickFresher(mirror, null), mirror);
  assert.equal(pickFresher(null, null), null);
});
test("pickFresher: newer savedAt wins, ties and legacy copies keep localStorage", () => {
  const older = { savedAt: 100 }, newer = { savedAt: 200 }, unstamped = {};
  assert.equal(pickFresher(older, newer), newer);
  assert.equal(pickFresher(newer, older), newer);
  assert.equal(pickFresher(older, older), older);
  assert.equal(pickFresher(unstamped, unstamped), unstamped);
});

console.log("day sanitization");
test("sanitizeDay repairs malformed fields and keeps unknown ones", () => {
  const dirty = {
    activities: "run", checks: [], weight: "212",
    proteinEntries: ["40", "junk", 30, -5],
    pullups: { sets: "nope", test: { grip: "chin", reps: 4 } },
    futureField: { keep: true },
  };
  const clean = sanitizeDay(dirty);
  assert.deepEqual(clean.activities, []);
  assert.deepEqual(clean.checks, {});
  assert.deepEqual(clean.proteinEntries, [40, 30]);
  assert.deepEqual(clean.pullups.sets, []);
  assert.equal(clean.pullups.test.reps, 4);
  assert.equal(clean.weight, "212");
  assert.deepEqual(clean.futureField, { keep: true });
  assert.equal(sanitizeDay(null), null);
  assert.equal(sanitizeDay([1, 2]), null);
});

test("mergeImport sanitizes hostile days instead of importing them verbatim", () => {
  const hostile = { days: { "2026-05-01": { activities: null, weight: "215" }, "2026-05-02": "garbage" } };
  const m = mergeImport({ days: {}, runWeek: 1, runAck: {}, custom: {}, goals: GOALS }, hostile);
  assert.deepEqual(m.days["2026-05-01"].activities, []);
  assert.equal(m.days["2026-05-01"].weight, "215");
  assert.equal(m.days["2026-05-02"], undefined);
  // the repaired day renders: these are the exact calls Today makes
  assert.equal(m.days["2026-05-01"].activities.includes("run"), false);
  assert.equal(proteinOf(m.days["2026-05-01"]), 0);
});

console.log("pull-up program");
const pDay = (grip, reps, extra = {}) => ({ pullups: { sets: [{ grip, reps, assist: "full" }], ...extra } });
const pData = {
  days: {
    // Mon Jun 29 → Sun Jul 5 week for week-stat tests
    "2026-06-29": pDay("chin", 3, { test: { grip: "chin", reps: 5 } }),
    "2026-06-30": pDay("neutral", 2),
    "2026-07-02": pDay("wide", 2),
    "2026-07-03": { pullups: { sets: [{ grip: "chin", reps: 3 }, { grip: "chin", reps: 3, assist: "band" }] } },
  },
};
test("grip rotation by session count: chin → neutral → wide → chin", () => {
  assert.equal(suggestedGrip({ days: {} }, "2026-07-12"), "chin");
  assert.equal(suggestedGrip(pData, "2026-06-30"), "neutral"); // one prior day
  assert.equal(suggestedGrip(pData, "2026-07-03"), "chin");    // three prior days wraps
  // a started day stays on its own grip
  assert.equal(suggestedGrip(pData, "2026-06-30" ) , "neutral");
  assert.equal(suggestedGrip(pData, "2026-07-02"), "wide");
});
test("prescription tiers", () => {
  assert.equal(prescription(null).level, "Test day");
  assert.equal(prescription(0).level, "Foundation");
  const g = prescription(2); assert.equal(g.level, "Groove"); assert.equal(g.reps, 1);
  const v = prescription(6); assert.equal(v.level, "Volume"); assert.equal(v.reps, 3);
  const d = prescription(10); assert.equal(d.level, "Density"); assert.equal(d.reps, 6);
});
test("workingMax: exact grip beats fallback", () => {
  const wm = workingMax(pData, "chin");
  assert.equal(wm.reps, 5); assert.equal(wm.exact, true);
  const fb = workingMax(pData, "wide");
  assert.equal(fb.reps, 5); assert.equal(fb.exact, false); // falls back to chin test
  assert.equal(workingMax({ days: {} }, "chin"), null);
});
test("bestTestBefore for PR detection", () => {
  assert.equal(bestTestBefore(pData, "chin", "2026-07-12"), 5);
  assert.equal(bestTestBefore(pData, "chin", "2026-06-29"), null); // strictly before
  assert.equal(bestTestBefore(pData, "wide", "2026-07-12"), null);
});
test("testDue: never tested or 10+ days", () => {
  assert.equal(testDue(pData, "wide", "2026-07-12"), true);          // never tested
  assert.equal(testDue(pData, "chin", "2026-07-03"), false);         // 4 days after
  assert.equal(testDue(pData, "chin", "2026-07-09"), true);          // 10 days after
});
test("week stats: days and reps in the Monday week", () => {
  assert.equal(weekPullupDays(pData, "2026-07-01"), 4);
  assert.equal(weekPullupReps(pData, "2026-07-01"), 3 + 2 + 2 + 6);
  assert.equal(weekPullupDays(pData, "2026-07-08"), 0);
});
test("pullupVolume counts band and negative reps", () => {
  assert.equal(pullupVolume(pData.days["2026-07-03"]), 6);
  assert.equal(pullupVolume(undefined), 0);
});
test("legacy days without pullups are untouched", () => {
  assert.equal(pullupVolume(legacyDay), 0);
  assert.equal(GRIP_ORDER.length, 3);
});

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}`);
