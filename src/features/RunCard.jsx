import { useState } from "react";
import { RUN_WEEKS } from "../plan.js";
import { Card } from "../components/ui.jsx";
import { num, sanitizeDecimal, round1 } from "../lib/util.js";
import { keyPlus } from "../lib/dates.js";
import RunTimer from "./RunTimer.jsx";

export default function RunCard({ data, day, setDay, update, dateKey }) {
  const [timerOpen, setTimerOpen] = useState(false);
  const w = day.runWeek || data.runWeek;
  const rw = RUN_WEEKS[w];
  const done = (day.checks || {}).run;

  const adjacentRun = [-1, 1].some((off) => {
    const dd = data.days[keyPlus(dateKey, off)];
    return dd && (dd.activities || []).includes("run");
  });

  const completedRunsAtWeek = Object.values(data.days).filter(
    (dd) => (dd.activities || []).includes("run") && dd.checks?.run && (dd.runWeek || 0) === w
  ).length;

  const markComplete = ({ totalMins } = {}) => {
    const patch = { checks: { ...(day.checks || {}), run: true }, runWeek: w };
    if (!day.activities.includes("run")) patch.activities = [...day.activities, "run"];
    if (totalMins && !num(day.runMins)) patch.runMins = String(totalMins);
    setDay(patch);
  };

  const dist = num(day.runDistance);
  const mins = num(day.runMins);
  const pace = dist && mins ? mins / dist : null;

  return (
    <Card style={{ marginTop: 12 }}>
      {timerOpen && (
        <RunTimer week={w} customCfg={data.customRun || undefined}
          onCustomChange={(cfg) => update((d) => ({ ...d, customRun: cfg }))}
          onComplete={markComplete} onClose={() => setTimerOpen(false)} />
      )}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div className="display" style={{ fontSize: 19, fontWeight: 700 }}>Run · {rw.label}</div>
        <select
          value={w}
          onChange={(e) => { const v = parseInt(e.target.value); setDay({ runWeek: v }); update((d) => ({ ...d, runWeek: v })); }}
          style={{ width: "auto", padding: "6px 8px", fontSize: 13 }}>
          {Object.keys(RUN_WEEKS).map((k) => <option key={k} value={k}>Week {k}</option>)}
        </select>
      </div>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, color: "var(--ember)", lineHeight: 1.15 }}>{rw.protocol}</div>
      <div style={{ fontSize: 13, color: "var(--dim)", margin: "8px 0 4px" }}>{rw.detail}</div>
      <div style={{ fontSize: 13, color: "var(--dim)" }}>{rw.cool}. If the week felt hard, repeat it — the plan bends, your shins don't.</div>

      {adjacentRun && (
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "color-mix(in srgb, var(--ember) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--ember) 33%, transparent)", fontSize: 13, color: "var(--ember)", fontWeight: 600 }}>
          ⚠ Back-to-back run days. Fine once in a while, but tendons want ~48h between runs.
        </div>
      )}

      {!done && (
        <button className="btn primary display" style={{ width: "100%", marginTop: 12, padding: "13px 0", fontSize: 18, borderRadius: 12 }}
          onClick={() => setTimerOpen(true)}>
          ▶ Guided run · plan week, intervals, or free
        </button>
      )}

      <button
        className="btn"
        style={{ width: "100%", marginTop: 10, ...(done ? { background: "var(--good)", color: "var(--on-accent)", borderColor: "var(--good)" } : {}) }}
        onClick={() => setDay({ checks: { ...(day.checks || {}), run: !done } })}>
        {done ? "✓ Run completed" : "Mark run completed (no timer)"}
      </button>

      {done && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <div className="section-label">From your Garmin</div>
          <div className="row" style={{ gap: 8 }}>
            <div className="grow">
              <div className="field-label">Distance <span className="unit">mi</span></div>
              <input inputMode="decimal" placeholder="—" value={day.runDistance || ""}
                onChange={(e) => setDay({ runDistance: sanitizeDecimal(e.target.value) })} />
            </div>
            <div className="grow">
              <div className="field-label">Time <span className="unit">min</span></div>
              <input inputMode="decimal" placeholder="—" value={day.runMins || ""}
                onChange={(e) => setDay({ runMins: sanitizeDecimal(e.target.value) })} />
            </div>
            <div className="grow" style={{ textAlign: "center" }}>
              <div className="field-label">Pace</div>
              <div className="display" style={{ fontSize: 22, fontWeight: 700, color: pace ? "var(--fuel)" : "var(--dim)", padding: "8px 0" }}>
                {pace ? `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, "0")}` : "—"}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>
            Pace trends live on the Progress tab. {dist ? `${round1(dist)} mi banked.` : "Type the distance from your watch."}
          </div>
        </div>
      )}

      {(() => {
        if (w !== data.runWeek || w >= 10) return null;
        const ack = (data.runAck || {})[w] || 0;
        if (completedRunsAtWeek - ack < 2) return null;
        return (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: "color-mix(in srgb, var(--good) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--good) 33%, transparent)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--good)", marginBottom: 8 }}>
              ✓ {completedRunsAtWeek} runs done at Week {w} — ready to move up?
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn grow" style={{ background: "var(--good)", color: "var(--on-accent)", borderColor: "var(--good)", fontWeight: 800, fontSize: 13 }}
                onClick={() => update((d) => ({ ...d, runWeek: Math.min(10, w + 1) }))}>
                Advance to Week {w + 1}
              </button>
              <button className="btn grow" style={{ fontWeight: 700, fontSize: 13 }}
                onClick={() => update((d) => ({ ...d, runAck: { ...(d.runAck || {}), [w]: completedRunsAtWeek } }))}>
                Repeat Week {w}
              </button>
            </div>
          </div>
        );
      })()}
    </Card>
  );
}
