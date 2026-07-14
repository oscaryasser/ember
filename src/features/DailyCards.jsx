import { useState } from "react";
import { Card, SectionLabel, Field } from "../components/ui.jsx";
import { num, netOf, proteinOf, intakeOf, mealsOf, sanitizeDecimal } from "../lib/util.js";

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

// Protein quick-add with editable goal from settings.
export function ProteinCard({ day, setDay, goal }) {
  const [collapsed, setCollapsed] = useState(true);
  const [draft, setDraft] = useState("");
  const entries = day.proteinEntries || [];
  const total = proteinOf(day);
  const scaleMax = Math.max(200, goal * 1.25);
  const pct = Math.min(100, (total / scaleMax) * 100);
  const goalPct = Math.min(100, (goal / scaleMax) * 100);
  const hit = total >= goal;

  const addEntry = (g) => {
    if (!g || g <= 0) return;
    const migrated = entries.length === 0 && num(day.protein) ? [num(day.protein)] : entries;
    setDay({ proteinEntries: [...migrated, g], protein: "" });
  };
  const removeEntry = (i) => setDay({ proteinEntries: entries.filter((_, x) => x !== i) });

  return (
    <Card style={{ marginTop: 16, borderColor: hit ? "color-mix(in srgb, var(--good) 40%, var(--line))" : undefined }}>
      <button className="row" style={{ width: "100%", justifyContent: "space-between", textAlign: "left" }}
        onClick={() => setCollapsed((c) => !c)}>
        <SectionLabel>Protein</SectionLabel>
        <div style={{ fontSize: 13, fontWeight: 700, color: hit ? "var(--good)" : "var(--dim)", marginBottom: 10 }}>
          {total > 0 ? `${Math.round(total)}g · ${hit ? "goal hit ✓" : Math.ceil(goal - total) + "g to go"}` : "tap to log"} {collapsed ? "▾" : "▴"}
        </div>
      </button>
      {!collapsed && (
        <div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div className="display" style={{ fontSize: 32, fontWeight: 700, color: hit ? "var(--good)" : "var(--text)" }}>
              {Math.round(total)}<span style={{ fontSize: 15, color: "var(--dim)" }}> / {goal}g</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: hit ? "var(--good)" : "var(--dim)" }}>
              {hit ? "✓ goal hit" : `${Math.max(0, Math.ceil(goal - total))}g to go`}
            </div>
          </div>
          <div style={{ position: "relative", background: "var(--card2)", borderRadius: 8, height: 14, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: hit ? "var(--c-good)" : "var(--c-fuel)", borderRadius: 8, transition: "width 0.3s" }} />
            <div style={{ position: "absolute", left: `${goalPct}%`, top: 0, bottom: 0, width: 2, background: "var(--good)" }} />
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[10, 20, 30, 40].map((g) => (
              <button key={g} className="btn grow" style={{ minWidth: 56, fontWeight: 800 }} onClick={() => addEntry(g)}>
                +{g}g
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <input inputMode="decimal" placeholder="custom grams, e.g. 47" value={draft}
              onChange={(e) => setDraft(sanitizeDecimal(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") { addEntry(num(draft)); setDraft(""); } }}
              style={{ flex: 1, fontSize: 15, padding: "9px 12px" }} />
            <button className="btn" style={num(draft) ? { background: "var(--fuel)", color: "var(--on-accent)", borderColor: "var(--fuel)", fontWeight: 800 } : { fontWeight: 800, color: "var(--dim)" }}
              onClick={() => { addEntry(num(draft)); setDraft(""); }}>
              Add
            </button>
            <button className="btn" title="Replace today's entries with this total (copied from MyFitnessPal)"
              style={{ fontWeight: 800, fontSize: 13, color: num(draft) ? "var(--text)" : "var(--dim)" }}
              onClick={() => { const g = num(draft); if (g) { setDay({ proteinEntries: [g], protein: "" }); setDraft(""); } }}>
              = MFP total
            </button>
          </div>
          {(entries.length > 0 || num(day.protein)) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {num(day.protein) ? (
                <div style={{ background: "var(--card2)", borderRadius: 8, padding: "5px 10px", fontSize: 13, color: "var(--dim)" }}>{num(day.protein)}g (earlier)</div>
              ) : null}
              {entries.map((g, i) => (
                <div key={i} style={{ background: "var(--card2)", borderRadius: 8, padding: "5px 8px 5px 10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  {g}g <button onClick={() => removeEntry(i)} aria-label={`Remove ${g}g entry`} style={{ color: "var(--dim)", fontWeight: 700 }}>×</button>
                </div>
              ))}
            </div>
          )}
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
  const prot = proteinOf(day);

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
        {prot > 0 && (
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: prot >= goals.protein ? "var(--good)" : prot >= goals.protein * 0.75 ? "var(--ember)" : "var(--bad)" }}>
            Protein {Math.round(prot)}g{" "}
            {prot >= goals.protein
              ? "· target hit — this is what keeps the muscle"
              : prot >= goals.protein * 0.75
                ? "· close, get one more protein feeding in"
                : "· low — recomp doesn't work without it"}
          </div>
        )}
      </div>
    </Card>
  );
}
