import { useState } from "react";
import { Card, SectionLabel, Field } from "../components/ui.jsx";
import { num, netOf, intakeOf, mealsOf } from "../lib/util.js";

// Garmin log: calories in/out, steps, sleep — collapsible.
export function GarminCard({ day, setDay }) {
  const [collapsed, setCollapsed] = useState(true);
  const cin = intakeOf(day);
  const out = (num(day.calActive) || 0) + (num(day.calResting) || 0);
  return (
    <Card style={{ marginTop: 16 }}>
      <button className="row" style={{ width: "100%", justifyContent: "space-between", textAlign: "left" }}
        onClick={() => setCollapsed((c) => !c)}>
        <SectionLabel>Garmin & MFP log</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--dim)", fontWeight: 600, marginBottom: 10 }}>
          {cin === null && !out
            ? (collapsed ? "tap to log ▾" : "▴")
            : `${cin !== null ? cin.toLocaleString() : "—"} in · ${out ? out.toLocaleString() : "—"} out ${collapsed ? "▾" : "▴"}`}
        </div>
      </button>
      {!collapsed && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Field label="Calories in" unit={mealsOf(day).length ? "kcal · overrides the food log" : "kcal · MFP total or food log"} value={day.calIn} onChange={(v) => setDay({ calIn: v })} color="var(--fuel)" />
          <Field label="Active burn" unit="kcal" value={day.calActive} onChange={(v) => setDay({ calActive: v })} color="var(--ember)" />
          <Field label="Resting burn" unit="kcal" value={day.calResting} onChange={(v) => setDay({ calResting: v })} color="var(--ember)" />
          <Field label="Workout time" unit="min" value={day.mins} onChange={(v) => setDay({ mins: v })} />
          <Field label="Steps" unit="from Garmin" value={day.steps} onChange={(v) => setDay({ steps: v })} />
          <Field label="Sleep score" unit="0–100" value={day.sleepScore} onChange={(v) => setDay({ sleepScore: v })} />
          <Field label="Sleep time" unit="hours · overnight" value={day.sleepHours} onChange={(v) => setDay({ sleepHours: v })} />
          <Field label="Nap time" unit="hours · adds to sleep" value={day.napHours || ""} onChange={(v) => setDay({ napHours: v })} />
        </div>
      )}
    </Card>
  );
}

// Net energy balance — the signature card.
export function EnergyLedger({ day, goals }) {
  const cin = intakeOf(day) || 0;
  const out = (num(day.calActive) || 0) + (num(day.calResting) || 0);
  const max = Math.max(cin, out, 1);
  const net = netOf(day);

  let verdict = null;
  if (net !== null) {
    const deficit = -net;
    if (deficit >= goals.deficit) verdict = { txt: `Deficit hit · −${Math.round(deficit)} kcal`, color: "var(--good)" };
    else if (deficit > 0) verdict = { txt: `Small deficit · −${Math.round(deficit)} kcal`, color: "var(--ember)" };
    else verdict = { txt: `Surplus · +${Math.round(-deficit)} kcal`, color: "var(--bad)" };
  }

  const bar = (v, color) => (
    <div style={{ flex: 1, background: "var(--card2)", borderRadius: 8, height: 14, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, (v / max) * 100)}%`, height: "100%", background: color, borderRadius: 8, transition: "width 0.3s" }} />
    </div>
  );

  return (
    <Card style={{ marginTop: 12, borderColor: verdict ? `color-mix(in srgb, ${verdict.color} 40%, var(--line))` : undefined }}>
      <SectionLabel>Net energy balance</SectionLabel>
      <div className="row" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fuel)", width: 34 }}>IN</span>
        {bar(cin, "var(--c-fuel)")}
        <span className="display" style={{ fontWeight: 700, fontSize: 17, color: "var(--fuel)", width: 52, textAlign: "right" }}>{cin || "—"}</span>
      </div>
      <div className="row">
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ember)", width: 34 }}>OUT</span>
        {bar(out, "var(--c-ember)")}
        <span className="display" style={{ fontWeight: 700, fontSize: 17, color: "var(--ember)", width: 52, textAlign: "right" }}>{out || "—"}</span>
      </div>
      <div style={{ marginTop: 14, textAlign: "center" }}>
        {verdict ? (
          <div className="display" style={{ fontSize: 32, fontWeight: 700, color: verdict.color }}>{verdict.txt}</div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--dim)" }}>
            Log calories in + Garmin burn to see today's balance. Goal: −{goals.deficit} kcal/day.
          </div>
        )}
      </div>
    </Card>
  );
}
