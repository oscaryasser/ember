import { Card, SectionLabel } from "../components/ui.jsx";
import { weekKeys, keyPlus, todayKey, shortDay } from "../lib/dates.js";

// Tap-to-plan weekly schedule: cycle each day none → run → A → B. Planned
// sessions surface on the Today date strip and drive the suggestion chip.
const CYCLE = [undefined, "run", "A", "B"];
const META = {
  run: { letter: "R", color: "var(--ember)", label: "Run" },
  A: { letter: "A", color: "var(--fuel)", label: "Strength A" },
  B: { letter: "B", color: "var(--good)", label: "Strength B" },
};

export default function WeekPlanner({ data, update }) {
  const today = todayKey();
  const thisWeek = weekKeys(today);
  const nextWeek = weekKeys(keyPlus(thisWeek[0], 7));
  const sched = data.schedule || {};

  const cyclePlan = (k) => update((d) => {
    const cur = (d.schedule || {})[k];
    const nextVal = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    const s = { ...(d.schedule || {}) };
    if (nextVal === undefined) delete s[k]; else s[k] = nextVal;
    return { ...d, schedule: s };
  });

  const copyToNext = () => update((d) => {
    const s = { ...(d.schedule || {}) };
    thisWeek.forEach((k, i) => { const v = (d.schedule || {})[k]; if (v) s[nextWeek[i]] = v; });
    return { ...d, schedule: s };
  });

  const clearWeek = (keys) => update((d) => {
    const s = { ...(d.schedule || {}) };
    keys.forEach((k) => delete s[k]);
    return { ...d, schedule: s };
  });

  const weekRow = (keys, label) => {
    const planned = keys.filter((k) => sched[k]);
    return (
      <div style={{ marginTop: 10 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          {planned.length > 0 && (
            <button style={{ fontSize: 11, color: "var(--dim)" }} onClick={() => clearWeek(keys)}>clear</button>
          )}
        </div>
        <div className="row" style={{ gap: 5 }}>
          {keys.map((k) => {
            const v = sched[k];
            const m = v ? META[v] : null;
            const isToday = k === today;
            const past = k < today;
            return (
              <button key={k} onClick={() => cyclePlan(k)} aria-label={`Plan ${k}`}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 10, textAlign: "center", opacity: past ? 0.5 : 1,
                  background: m ? `color-mix(in srgb, ${m.color} 16%, transparent)` : "var(--card2)",
                  border: `1px solid ${isToday ? "var(--ember)" : m ? m.color : "var(--line)"}`,
                }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)" }}>{shortDay(k).slice(0, 2)}</div>
                <div className="display" style={{ fontSize: 15, fontWeight: 700, color: m ? m.color : "var(--text)", height: 20, lineHeight: "20px" }}>
                  {m ? m.letter : k.slice(8)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card style={{ marginTop: 12 }}>
      <SectionLabel color="var(--ember)">Plan your week</SectionLabel>
      <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 4 }}>
        Tap a day to cycle: <b style={{ color: "var(--ember)" }}>R</b>un → <b style={{ color: "var(--fuel)" }}>A</b> → <b style={{ color: "var(--good)" }}>B</b> → off.
        Planned sessions show on Today and drive the coach's suggestion.
      </div>
      {weekRow(thisWeek, "This week")}
      {weekRow(nextWeek, "Next week")}
      <button className="btn" style={{ width: "100%", marginTop: 12, fontWeight: 700 }} onClick={copyToNext}>
        Copy this week → next week
      </button>
    </Card>
  );
}
