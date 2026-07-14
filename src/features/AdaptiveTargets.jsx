import { useMemo } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { num, intakeOf } from "../lib/util.js";
import { keyOffset } from "../lib/dates.js";
import { estimateTDEE, resolveTargets, WINDOW_DAYS } from "../lib/adaptive.js";

// Measured metabolism: TDEE from the energy-balance identity over the trailing
// window, compared against what the watch claims — plus the intake + macro
// targets derived from it. The premium-app feature, computed from data Oscar
// already logs.
export default function AdaptiveTargets({ data, update }) {
  const est = useMemo(() => estimateTDEE(data), [data]);
  const targets = useMemo(() => resolveTargets(data), [data]);

  const garminAvg = useMemo(() => {
    const vals = [];
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const d = data.days[keyOffset(-i)];
      if (!d) continue;
      const burn = (num(d.calActive) || 0) + (num(d.calResting) || 0);
      if (burn > 0) vals.push(burn);
    }
    return vals.length >= 5 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [data]);

  const avgIntake7 = useMemo(() => {
    const vals = [];
    for (let i = 0; i < 7; i++) {
      const v = intakeOf(data.days[keyOffset(-i)]);
      if (v !== null) vals.push(v);
    }
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [data]);

  if (!est.ok) {
    return (
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel color="var(--fuel)">Measured metabolism · adaptive targets</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>
          Once there's enough history, Ember measures your real TDEE from intake + the weight trend
          and sets your calorie target from it — no formulas, no trusting the watch.
          <br /><b style={{ color: "var(--text)" }}>Still needed:</b> {est.reason}.
        </div>
        {targets.kcal !== null && targets.source === "garmin" && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "color-mix(in srgb, var(--fuel) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--fuel) 30%, var(--line))" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              Meanwhile: eat ~{targets.kcal.toLocaleString()} kcal/day
              <span style={{ color: "var(--dim)", fontWeight: 600 }}> (Garmin burn {targets.garmin.toLocaleString()} − {data.goals.deficit})</span>
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Protein <b>{targets.protein}g</b> · Fat <b>{targets.fat}g</b> · Carbs <b>{targets.carbs}g</b>
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
              Provisional — the measured number replaces it automatically once there's enough data.
            </div>
          </div>
        )}
      </Card>
    );
  }

  const garminDelta = garminAvg !== null ? Math.round(((garminAvg - est.tdee) / est.tdee) * 100) : null;

  return (
    <Card style={{ marginBottom: 12 }}>
      <SectionLabel color="var(--fuel)">Measured metabolism · adaptive targets</SectionLabel>
      <div className="row" style={{ alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div className="display" style={{ fontSize: 34, fontWeight: 700, color: "var(--fuel)" }}>
          {est.tdee.toLocaleString()}<span style={{ fontSize: 15, color: "var(--dim)" }}> kcal/day real burn</span>
        </div>
        {garminDelta !== null && Math.abs(garminDelta) >= 3 && (
          <div style={{ fontSize: 13, fontWeight: 700, color: Math.abs(garminDelta) > 10 ? "var(--ember)" : "var(--dim)" }}>
            Garmin says {garminAvg.toLocaleString()} ({garminDelta > 0 ? "+" : ""}{garminDelta}%)
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--dim)", margin: "2px 0 10px" }}>
        From {est.intakeDays} intake days + {est.weighIns} weigh-ins over {est.spanDays} days:
        eating {est.avgIntake.toLocaleString()}/day while trending {est.lbsPerWeek <= 0 ? "" : "+"}{est.lbsPerWeek} lb/week.
        The scale doesn't lie about averages.
      </div>

      {targets.kcal !== null && (
        <div style={{ padding: "10px 12px", borderRadius: 12, background: "color-mix(in srgb, var(--fuel) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--fuel) 30%, var(--line))" }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            Eat ~{targets.kcal.toLocaleString()} kcal/day
            <span style={{ color: "var(--dim)", fontWeight: 600 }}> for your −{data.goals.deficit} goal{targets.kcalAuto ? "" : " (your manual target)"}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", marginTop: 4 }}>
            Protein <b>{targets.protein}g</b> · Fat <b>{targets.fat}g</b>{targets.fatAuto ? " (30%)" : ""} · Carbs <b>{targets.carbs}g</b>{targets.carbsAuto ? " (the rest)" : ""}
          </div>
          {avgIntake7 !== null && (
            <div style={{ fontSize: 12, marginTop: 6, fontWeight: 700, color: avgIntake7 <= targets.kcal ? "var(--good)" : "var(--ember)" }}>
              Last 7 days you averaged {avgIntake7.toLocaleString()} — {avgIntake7 <= targets.kcal ? "under target, on plan" : `${(avgIntake7 - targets.kcal).toLocaleString()} over — tighten the next few days`}
            </div>
          )}
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 8 }}>
        Re-measured continuously from the last {WINDOW_DAYS} days. Override any number on the Goals tab; blank = adaptive.
      </div>
    </Card>
  );
}
