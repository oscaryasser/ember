import { useEffect, useMemo, useRef, useState } from "react";
import { Card, SectionLabel, Chip } from "../components/ui.jsx";
import { num, netOf, sanitizeDecimal } from "../lib/util.js";
import { todayKey, keyOffset, shortDay, niceDate } from "../lib/dates.js";
import { weekStatsFor, suggestTraining } from "../lib/coach.js";
import HeroRing from "../features/HeroRing.jsx";
import { getDay, patchDay } from "../store.jsx";
import StrengthCard from "../features/StrengthCard.jsx";
import RunCard from "../features/RunCard.jsx";
import { GarminCard, EnergyLedger } from "../features/DailyCards.jsx";
import PullupCard from "../features/PullupCard.jsx";
import FoodCard from "../features/FoodCard.jsx";

export default function Today({ data, update, goTo }) {
  const [dateKey, setDateKey] = useState(todayKey());

  // iOS resumes installed PWAs from memory days later — without this, the
  // morning weigh-in silently lands on yesterday's date.
  const knownToday = useRef(todayKey());
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === "hidden") return;
      const t = todayKey();
      if (t !== knownToday.current) {
        setDateKey((k) => (k === knownToday.current ? t : k)); // only follow if user was on "today"
        knownToday.current = t;
      }
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, []);

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
      {/* hero: the day as a budget + the week at a glance */}
      <Card style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <HeroRing data={data} day={day} />
        <div className="grow" style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px" }}>
          <div style={{ flex: "1 1 40%", textAlign: "center" }}>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, color: weekStats.deficit > 0 ? "var(--good)" : weekStats.logged ? "var(--bad)" : "var(--dim)" }}>
              {weekStats.logged ? `${weekStats.deficit > 0 ? "−" : "+"}${Math.abs(Math.round(weekStats.deficit)).toLocaleString()}` : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>week kcal</div>
          </div>
          <div style={{ flex: "1 1 40%", textAlign: "center" }}>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, color: weekStats.runs + weekStats.strength >= sessionTarget ? "var(--good)" : "var(--text)" }}>
              {weekStats.runs + weekStats.strength}<span style={{ fontSize: 15, color: "var(--dim)" }}>/{sessionTarget}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>sessions</div>
          </div>
          <button onClick={() => goTo("progress")} style={{ flex: "1 1 100%", textAlign: "center" }}>
            <span className="display" style={{ fontSize: 17, fontWeight: 700, color: "var(--ember)" }}>
              {weights.length ? `${weights[weights.length - 1].w} lbs` : "no weigh-in"}
            </span>
            <span style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}> · graph →</span>
          </button>
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
              aria-pressed={active} aria-label={niceDate(k)}
              style={{
                minWidth: 46, textAlign: "center", padding: "8px 4px", borderRadius: 12,
                background: active ? "var(--ember)" : "var(--card)",
                border: `1px solid ${active ? "var(--ember)" : "var(--line)"}`,
              }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: active ? "var(--on-accent)" : "var(--dim)", textTransform: "uppercase" }}>{shortDay(k)}</div>
              <div className="display" style={{ fontSize: 17, fontWeight: 700, color: active ? "var(--on-accent)" : "var(--text)" }}>{k.slice(8)}</div>
              <div style={{ height: 12 }}>
                {hasLog ? (
                  !active && <div style={{ width: 5, height: 5, borderRadius: 3, background: "var(--good)", margin: "3px auto 0" }} />
                ) : (data.schedule || {})[k] ? (
                  <div style={{ fontSize: 10, fontWeight: 800, color: active ? "var(--on-accent)" : (data.schedule[k] === "run" ? "var(--ember)" : "var(--fuel)") }}>
                    {data.schedule[k] === "run" ? "R" : data.schedule[k]}
                  </div>
                ) : null}
              </div>
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

      {/* today's suggestion — tap to apply */}
      {dateKey === todayKey() && (() => {
        const sug = suggestTraining(data, dateKey);
        if (!sug) return null;
        return (
          <button
            onClick={() => sug.act && toggleActivity(sug.act)}
            className="row"
            style={{
              width: "100%", textAlign: "left", gap: 10, marginBottom: 14, padding: "10px 12px",
              borderRadius: 12, border: "1px solid color-mix(in srgb, var(--ember) 40%, var(--line))",
              background: "color-mix(in srgb, var(--ember) 7%, transparent)",
            }}>
            <span style={{ fontSize: 18 }}>{sug.act === "run" ? "🏃" : sug.act ? "🏋️" : "🧘"}</span>
            <span className="grow">
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ember)" }}>{sug.label}</span>
              <span style={{ fontSize: 12, color: "var(--dim)", display: "block" }}>{sug.why}</span>
            </span>
            {sug.act && <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ember)", flexShrink: 0 }}>tap to start →</span>}
          </button>
        );
      })()}

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
      <FoodCard data={data} day={day} setDay={setDay} update={update} dateKey={dateKey} />
      <GarminCard day={day} setDay={setDay} />
      <EnergyLedger day={day} goals={goals} />
    </div>
  );
}
