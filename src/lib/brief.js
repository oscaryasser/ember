// "Copy AI coach brief" — the last four weeks condensed into a paste-ready
// text block, so any AI (or human) coach starts from the real numbers.
import { keyOffset, todayKey } from "./dates.js";
import { num, intakeOf, netOf, proteinOf, sleepTotalOf, e1rm, round1 } from "./util.js";
import { estimateTDEE, resolveTargets, adaptationCheck } from "./adaptive.js";
import { coachVerdict } from "./coach.js";
import { recompCheck } from "./recomp.js";
import { testHistory, GRIPS, pullupDayKeys, pullupVolume } from "./pullups.js";
import { STRENGTH_DAYS } from "./exercises.js";

const LIFT_IDS = [...STRENGTH_DAYS, "A", "B"]; // include legacy A/B days

const DAYS = 28;

export function buildCoachBrief(data) {
  const g = data.goals;
  const L = [];
  const push = (s) => L.push(s);

  let intakeDays = 0, intakeSum = 0, defDays = 0, defSum = 0, protDays = 0, protSum = 0, sleepDays = 0, sleepSum = 0;
  let runs = 0, lifts = 0, pullDays = 0, pullReps = 0;
  const weights = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = data.days[keyOffset(-i)];
    const cin = intakeOf(d);
    if (cin !== null) { intakeDays++; intakeSum += cin; }
    const n = netOf(d);
    if (n !== null) { defDays++; defSum += -n; }
    const p = d ? proteinOf(d) : 0;
    if (p > 0) { protDays++; protSum += p; }
    const sl = sleepTotalOf(d);
    if (sl !== null) { sleepDays++; sleepSum += sl; }
    if (d?.activities?.includes("run")) runs++;
    if (LIFT_IDS.some((id) => d?.activities?.includes(id))) lifts++;
    const w = num(d?.weight);
    if (w !== null) weights.push({ i, w });
    if ((d?.pullups?.sets || []).length) { pullDays++; pullReps += pullupVolume(d); }
  }

  push(`EMBER COACH BRIEF · ${todayKey()} · last ${DAYS} days`);
  push(`Goals: −${g.deficit} kcal/day deficit · protein ${g.protein}g · target weight ${g.targetWeight || "unset"} lbs · ${g.weeklyRuns} runs + ${g.weeklyStrength} lifts/week · pull-ups ${g.pullupDays}d/week`);

  if (weights.length >= 2) {
    const first = weights[0], last = weights[weights.length - 1];
    push(`Weight: ${first.w} → ${last.w} lbs (${round1(last.w - first.w)} over ${first.i - last.i}d, ${weights.length} weigh-ins)`);
  } else push("Weight: not enough weigh-ins");

  const est = estimateTDEE(data);
  push(est.ok
    ? `Measured TDEE: ${est.tdee} kcal (avg intake ${est.avgIntake}, trend ${est.lbsPerWeek} lb/wk)`
    : `Measured TDEE: not yet (${est.reason})`);
  const adapt = adaptationCheck(data);
  if (adapt.flagged) push(`⚠ Metabolic adaptation flagged: burn down ${adapt.drop} kcal (−${adapt.pct}%) vs 3 weeks ago`);

  push(`Intake: ${intakeDays}/${DAYS} days logged, avg ${intakeDays ? Math.round(intakeSum / intakeDays) : "—"} kcal · deficit avg ${defDays ? Math.round(defSum / defDays) : "—"} kcal over ${defDays}d`);
  push(`Protein: avg ${protDays ? Math.round(protSum / protDays) : "—"}g on ${protDays} logged days (goal ${g.protein})`);
  push(`Sleep: avg ${sleepDays ? (sleepSum / sleepDays).toFixed(1) : "—"}h incl. naps`);
  push(`Training: ${runs} runs · ${lifts} strength sessions · run plan week ${data.runWeek}/10`);
  push(`Pull-ups: ${pullDays} days · ${pullReps} total reps · maxes: ${
    ["chin", "neutral", "wide"].map((gr) => {
      const h = testHistory(data, gr);
      return `${GRIPS[gr].short} ${h.length ? h[h.length - 1].reps : "—"}`;
    }).join(", ")
  }`);

  // strongest movements: latest best e1RM per exercise over the window
  const best = {};
  for (let i = 0; i < DAYS; i++) {
    const d = data.days[keyOffset(-i)];
    if (!d?.sets) continue;
    for (const byName of Object.values(d.sets)) {
      for (const [name, sets] of Object.entries(byName)) {
        const b = Math.max(0, ...sets.map((s) => e1rm(s.w, s.r)));
        if (b > (best[name] || 0)) best[name] = b;
      }
    }
  }
  const lifted = Object.entries(best).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (lifted.length) push(`Lifts (best e1RM, 28d): ${lifted.map(([n, v]) => `${n} ${Math.round(v)}`).join(" · ")}`);

  const v = coachVerdict(data, todayKey());
  push(`App verdict this week: ${v.headline}`);
  const rc = recompCheck(data);
  if (rc.ready) push(`Recomp check: ${rc.headline}`);

  const t = resolveTargets(data);
  if (t.kcal !== null) push(`Current targets: ${t.kcal} kcal · P${t.protein}/C${t.carbs}/F${t.fat} (${t.source})`);

  push(`\nContext: 6-month body recomposition, data typed from Garmin watch + food log. Please analyze what's working, what to adjust, and anything the numbers suggest that the app's rules might miss.`);
  return L.join("\n");
}
