import { useMemo } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { num, netOf, proteinOf } from "../lib/util.js";
import { todayKey, keyOffset, shortDay } from "../lib/dates.js";
import { coachVerdict, logStreak, fullWeekStreak } from "../lib/coach.js";
import { BalanceBars, Sparkline } from "../components/charts.jsx";

const TONE = { good: "var(--good)", warn: "var(--ember)", bad: "var(--bad)", dim: "var(--dim)" };

export default function Coach({ data }) {
  const dateKey = todayKey();
  const goals = data.goals;
  const v = useMemo(() => coachVerdict(data, dateKey), [data, dateKey]);
  const color = TONE[v.tone];

  const last14 = useMemo(
    () => Array.from({ length: 14 }, (_, i) => {
      const k = keyOffset(i - 13);
      const dd = data.days[k];
      return { k, day: dd, net: netOf(dd) };
    }),
    [data]
  );

  const totalSessions = useMemo(() => {
    let t = 0;
    Object.values(data.days).forEach((d) => (t += (d.activities || []).length));
    return t;
  }, [data]);

  const avg = (vals) => {
    const xs = vals.filter((x) => x !== null && x !== undefined);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const last7 = last14.slice(-7);
  const avgSteps = avg(last7.map((d) => (d.day ? num(d.day.steps) : null)));
  const avgHours = avg(last7.map((d) => (d.day ? num(d.day.sleepHours) : null)));
  const avgScore = avg(last7.map((d) => (d.day ? num(d.day.sleepScore) : null)));

  const streakDays = useMemo(() => logStreak(data), [data]);
  const streakWeeks = useMemo(() => fullWeekStreak(data, dateKey), [data, dateKey]);

  const maxAbs = Math.max(...last14.map((d) => Math.abs(d.net ?? 0)), 600);

  const spark = (field) => last14.map((d) => (d.day ? num(d.day[field]) : null));
  const sparkProt = last14.map((d) => {
    const p = d.day ? proteinOf(d.day) : 0;
    return p > 0 ? p : null;
  });

  return (
    <div className="fade-in">
      <Card style={{ marginBottom: 12, borderColor: `color-mix(in srgb, ${color} 40%, var(--line))` }}>
        <SectionLabel color={color}>Weekly review · coach's verdict</SectionLabel>
        <div style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1.4, marginBottom: 10 }}>{v.headline}</div>
        {v.lines.map((l, i) => (
          <div key={i} className="row" style={{ gap: 8, alignItems: "baseline", padding: "4px 0", fontSize: 13 }}>
            <span style={{ color: l.ok ? "var(--good)" : "var(--dim)", fontWeight: 800, width: 14, flexShrink: 0 }}>{l.ok ? "✓" : "○"}</span>
            <span style={{ color: l.ok ? "var(--text)" : "var(--dim)" }}>{l.txt}</span>
          </div>
        ))}
      </Card>

      {/* streaks */}
      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <Card className="grow" style={{ textAlign: "center", padding: 12 }}>
          <div className="display" style={{ fontSize: 30, fontWeight: 700, color: streakDays > 0 ? "var(--ember)" : "var(--dim)" }}>
            {streakDays > 0 ? `🔥 ${streakDays}` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>day logging streak</div>
        </Card>
        <Card className="grow" style={{ textAlign: "center", padding: 12 }}>
          <div className="display" style={{ fontSize: 30, fontWeight: 700, color: streakWeeks > 0 ? "var(--good)" : "var(--dim)" }}>
            {streakWeeks > 0 ? `⚡ ${streakWeeks}` : "—"}
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>full {goals.weeklyRuns}+{goals.weeklyStrength} weeks in a row</div>
        </Card>
      </div>

      {/* week tiles */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
          <div className="display" style={{ fontSize: 32, fontWeight: 700, color: "var(--ember)" }}>
            {v.weekStats.runs}<span style={{ fontSize: 18, color: "var(--dim)" }}>/{goals.weeklyRuns}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>runs this week</div>
        </Card>
        <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
          <div className="display" style={{ fontSize: 32, fontWeight: 700, color: "var(--fuel)" }}>
            {v.weekStats.strength}<span style={{ fontSize: 18, color: "var(--dim)" }}>/{goals.weeklyStrength}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>strength this week</div>
        </Card>
        <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
          <div className="display" style={{ fontSize: 32, fontWeight: 700, color: v.weekStats.deficit >= 0 ? "var(--good)" : "var(--bad)" }}>
            {v.weekStats.deficit >= 0 ? "−" : "+"}{Math.abs(Math.round(v.weekStats.deficit)).toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>
            week deficit · goal {(goals.deficit * 7).toLocaleString()} kcal ({v.weekStats.logged}d logged)
          </div>
        </Card>
        <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
          <div className="display" style={{ fontSize: 32, fontWeight: 700 }}>{totalSessions}</div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>total sessions logged</div>
        </Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <SectionLabel>Last 14 days · daily balance</SectionLabel>
        <BalanceBars
          maxAbs={maxAbs}
          items={last14.map(({ k, day, net }, i) => ({
            k, net,
            trained: day && (day.activities || []).length > 0,
            label: i % 2 === 1 ? shortDay(k).slice(0, 2) : "",
          }))}
        />
      </Card>

      {/* 14-day trend tiles */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <Card style={{ flex: "1 1 45%", minWidth: 140 }}>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, color: avgSteps === null ? "var(--dim)" : avgSteps >= goals.steps ? "var(--good)" : "var(--text)" }}>
            {avgSteps === null ? "—" : Math.round(avgSteps).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>avg steps / 7d · aim {(goals.steps / 1000).toFixed(0)}k+</div>
          <Sparkline pts={spark("steps")} color="var(--c-fuel)" />
        </Card>
        <Card style={{ flex: "1 1 45%", minWidth: 140 }}>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, color: avgHours === null ? "var(--dim)" : avgHours >= goals.sleepHours ? "var(--good)" : "var(--ember)" }}>
            {avgHours === null ? "—" : avgHours.toFixed(1) + "h"}
            {avgScore !== null && <span style={{ fontSize: 15, color: "var(--dim)" }}> · {Math.round(avgScore)}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>avg sleep / 7d · muscle is built here</div>
          <Sparkline pts={spark("sleepHours")} color="var(--c-fuel)" />
        </Card>
        <Card style={{ flex: "1 1 45%", minWidth: 140 }}>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, color: v.avgProt === null ? "var(--dim)" : v.avgProt >= goals.protein - 10 ? "var(--good)" : "var(--ember)" }}>
            {v.avgProt === null ? "—" : Math.round(v.avgProt) + "g"}
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>avg protein / 7d · goal {goals.protein}g</div>
          <Sparkline pts={sparkProt} color="var(--c-ember)" />
        </Card>
        <Card style={{ flex: "1 1 45%", minWidth: 140 }}>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, color: "var(--text)" }}>
            {v.lossRate === null ? "—" : `${v.lossRate >= 0 ? "−" : "+"}${Math.abs(v.lossRate).toFixed(1)}`}
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>lb/week · 7d avg vs previous 7d</div>
          <Sparkline pts={spark("weight")} color="var(--c-ember)" />
        </Card>
      </div>
    </div>
  );
}
