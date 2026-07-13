// Node unit tests for the pure logic. Run with: npm test
import assert from "node:assert/strict";
import { buildRunSegments, totalSecs, RUN_WEEKS } from "../src/plan.js";
import { normalizeImport, summarizeImport, mergeImport } from "../src/lib/importExport.js";
import { num, netOf, proteinOf, e1rm } from "../src/lib/util.js";

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

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}`);
