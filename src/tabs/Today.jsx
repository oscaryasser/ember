import { useMemo, useState } from "react";
import { Card, SectionLabel, Chip } from "../components/ui.jsx";
import { num, netOf, sanitizeDecimal } from "../lib/util.js";
import { todayKey, keyOffset, shortDay, niceDate } from "../lib/dates.js";
import { weekStatsFor } from "../lib/coach.js";
import { getDay, patchDay } from "../store.jsx";
import StrengthCard from "../features/StrengthCard.jsx";
import RunCard from "../features/RunCard.jsx";
import { GarminCard, ProteinCard, EnergyLedger } from "../features/DailyCards.jsx";
import PullupCard from "../features/PullupCard.jsx";

export default function Today({ data, update, goTo }) {
  const [dateKey, setDateKey] = useState(todayKey());
  const day = getDay(data, dateKey);
  const setDay = patchDay(update, dateKey);
  const goals = data.goals;

  const weekStats = useMemo(() => weekStatsFor(data, dateKey), [data, dateKey]);
  const sessionTarget = goals.weeklyRuns + goals.weeklyStrength;

  const weights = useMemo(
    () =>
      Object.entries(data.days)
        .filter(([, d]) => num(d.weight) !== null)
        .map(([k, d]) => ({ k, w: num(d.weight) }))
        .sort((a, b) => (a.k < b.k ? -1 : 1)),
    [data]
  );

  const toggleActivity = (act) => {
    const has = day.activities.includes(act);
    const activities = has ? day.activities.filter((a) => a !== act) : [...day.activities, act];
    const patch = { activities };
    if (act === "run" && !has && !day.runWeek) patch.runWeek = data.runWeek;
    setDay(patch);
  };

  const target = num(goals.targetWeight);

  return (
    <div className="fade-in">
      {/* progress hero — results before inputs */}
      <Card style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => goTo("progress")} style={{ flex: "1 1 40%", minWidth: 110, textAlign: "left" }}>
          {weights.length >= 2 ? (() => {
            const pts = weights.slice(-14);
            const ys = pts.map((p) => p.w).concat(target !== null ? [target] : []);
            const yMin = Math.min(...ys) - 1, yMax = Math.max(...ys) + 1;
            const W = 130, H = 48;
            const X = (i) => 2 + (i / (pts.length - 1)) * (W - 4);
            const Y = (v) => 4 + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - 8);
            const path = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join(" ");
            return (
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
                {target !== null && <line x1="2" x2={W - 2} y1={Y(target)} y2={Y(target)} stroke="var(--c-good)" strokeWidth="1.2" strokeDasharray="4 3" />}
                <path d={path} fill="none" stroke="var(--c-ember)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1].w)} r="3.2" fill="var(--c-ember)" />
              </svg>
            );
          })() : (
            <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.4 }}>Log 2+ weigh-ins and your trend line appears here</div>
          )}
          <div style={{ fontSize: 11, color: "var(--dim)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginTop: 2 }}>
            {weights.length ? `${weights[weights.length - 1].w} lbs · tap for graph` : "weight trend"}
          </div>
        </button>
        <div style={{ flex: "1 1 25%", textAlign: "center" }}>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, color: weekStats.deficit > 0 ? "var(--good)" : weekStats.logged ? "var(--bad)" : "var(--dim)" }}>
            {weekStats.logged ? `${weekStats.deficit > 0 ? "−" : "+"}${Math.abs(Math.round(weekStats.deficit)).toLocaleString()}` : "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>week kcal</div>
        </div>
        <div style={{ flex: "1 1 20%", textAlign: "center" }}>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, color: weekStats.runs + weekStats.strength >= sessionTarget ? "var(--good)" : "var(--text)" }}>
            {weekStats.runs + weekStats.strength}<span style={{ fontSize: 15, color: "var(--dim)" }}>/{sessionTarget}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>sessions</div>
        </div>
      </Card>

      {/* date strip */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 4 }}>
        {Array.from({ length: 8 }, (_, i) => keyOffset(i - 6)).map((k) => {
          const active = k === dateKey;
          const dd = data.days[k];
          const hasLog = dd && ((dd.activities || []).length || netOf(dd) !== null);
          return (
            <button key={k} onClick={() => setDateKey(k)}
              style={{
                minWidth: 46, textAlign: "center", padding: "8px 4px", borderRadius: 12,
                background: active ? "var(--ember)" : "var(--card)",
                border: `1px solid ${active ? "var(--ember)" : "var(--line)"}`,
              }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: active ? "var(--on-accent)" : "var(--dim)", textTransform: "uppercase" }}>{shortDay(k)}</div>
              <div className="display" style={{ fontSize: 17, fontWeight: 700, color: active ? "var(--on-accent)" : "var(--text)" }}>{k.slice(8)}</div>
              <div style={{ height: 5 }}>{hasLog && !active && <div style={{ width: 5, height: 5, borderRadius: 3, background: "var(--good)", margin: "0 auto" }} />}</div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 12 }}>
        {niceDate(dateKey)}{dateKey === todayKey() ? " · today" : ""}
      </div>

      {/* weigh-in */}
      <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 26 }}>⚖️</div>
        <div style={{ flex: "1 1 90px", minWidth: 90 }}>
          <div className="field-label">Today's weight</div>
          <input inputMode="decimal" placeholder="lbs" value={day.weight}
            onChange={(e) => setDay({ weight: sanitizeDecimal(e.target.value) })}
            style={{ fontSize: 22, padding: "8px 10px" }} />
        </div>
        <div style={{ flex: "1 1 90px", minWidth: 90 }}>
          <div className="field-label" style={{ color: "var(--good)" }}>Target</div>
          <input inputMode="decimal" placeholder="set goal" value={goals.targetWeight || ""}
            onChange={(e) => update((d) => ({ ...d, goals: { ...d.goals, targetWeight: sanitizeDecimal(e.target.value) } }))}
            style={{ fontSize: 22, padding: "8px 10px", borderColor: "color-mix(in srgb, var(--good) 40%, var(--line))" }} />
        </div>
        <div style={{ flex: "1 1 100%", fontSize: 13, color: "var(--dim)" }}>
          {(() => {
            const latest = weights.length ? weights[weights.length - 1].w : null;
            if (target === null) return "Set a target and Progress graphs your path to it. Weigh in 1–2× a week, same conditions.";
            if (latest === null) return `Target ${target} lbs set. Log your first weigh-in above to start the graph.`;
            const toGo = latest - target;
            return toGo > 0
              ? `${toGo.toFixed(1)} lbs to go → full graph on the Progress tab.`
              : "🎯 Target reached — time to set a new one or switch to maintenance.";
          })()}
        </div>
      </Card>

      <SectionLabel>
        What did you train?{" "}
        <span style={{ color: "var(--dim)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          (pick any — stack two if life happened)
        </span>
      </SectionLabel>
      <div className="chips">
        <Chip active={day.activities.includes("run")} color="var(--ember)" onClick={() => toggleActivity("run")}>🏃 Run</Chip>
        <Chip active={day.activities.includes("A")} color="var(--fuel)" onClick={() => toggleActivity("A")}>Strength A</Chip>
        <Chip active={day.activities.includes("B")} color="var(--fuel)" onClick={() => toggleActivity("B")}>Strength B</Chip>
      </div>
      {day.activities.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 8 }}>
          Rest day is a valid choice — you need ~3 of them a week. Weekly target: {goals.weeklyRuns} runs + {goals.weeklyStrength} strength, any days, any order.
        </div>
      )}

      {day.activities.includes("run") && <RunCard data={data} day={day} setDay={setDay} update={update} dateKey={dateKey} />}
      {day.activities.includes("A") && <StrengthCard id="A" data={data} day={day} setDay={setDay} update={update} dateKey={dateKey} />}
      {day.activities.includes("B") && <StrengthCard id="B" data={data} day={day} setDay={setDay} update={update} dateKey={dateKey} />}

      <PullupCard data={data} day={day} setDay={setDay} dateKey={dateKey} goals={goals} />
      <GarminCard day={day} setDay={setDay} />
      <ProteinCard day={day} setDay={setDay} goal={goals.protein} />
      <EnergyLedger day={day} goals={goals} />
    </div>
  );
}
