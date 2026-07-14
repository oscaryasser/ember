import { useMemo } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { weekKeys, keyPlus, todayKey } from "../lib/dates.js";
import { heatLevel } from "../lib/coach.js";

const WEEKS = 26; // ~6 months — the length of the recomp

// GitHub-style consistency grid: columns are Monday weeks, rows Mon→Sun.
// Solid = trained, faint = logged something, empty = nothing.
export default function Heatmap({ data }) {
  const { cols, monthLabels, counts } = useMemo(() => {
    const thisMonday = weekKeys(todayKey())[0];
    const cols = [];
    const monthLabels = [];
    let lastMonth = null;
    const counts = { trained: 0, logged: 0 };
    for (let w = WEEKS - 1; w >= 0; w--) {
      const monday = keyPlus(thisMonday, -7 * w);
      const days = Array.from({ length: 7 }, (_, i) => {
        const k = keyPlus(monday, i);
        if (k > todayKey()) return { k, level: -1 }; // future
        const level = heatLevel(data.days[k]);
        if (level === 2) counts.trained++;
        else if (level === 1) counts.logged++;
        return { k, level };
      });
      const mo = new Date(monday + "T12:00:00").toLocaleDateString("en-US", { month: "short" });
      monthLabels.push(mo !== lastMonth ? mo : "");
      lastMonth = mo;
      cols.push({ monday, days });
    }
    return { cols, monthLabels, counts };
  }, [data]);

  const CELL = 11, GAP = 1.5, TOP = 12;
  const W = WEEKS * (CELL + GAP);
  const H = TOP + 7 * (CELL + GAP);
  const fill = (level) =>
    level === 2 ? "var(--c-ember)"
    : level === 1 ? "color-mix(in srgb, var(--c-good) 40%, var(--card2))"
    : level === 0 ? "var(--card2)"
    : "transparent";

  return (
    <Card style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <SectionLabel>Last 6 months</SectionLabel>
        <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 10 }}>
          {counts.trained} trained · {counts.logged} logged
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Training consistency, one square per day">
        {monthLabels.map((m, i) => m && (
          <text key={i} x={i * (CELL + GAP)} y={8} fontSize="7.5" fill="var(--dim)">{m}</text>
        ))}
        {cols.map((col, ci) => col.days.map((d, ri) => (
          d.level >= 0 && (
            <rect key={d.k} x={ci * (CELL + GAP)} y={TOP + ri * (CELL + GAP)}
              width={CELL} height={CELL} rx="2.5" fill={fill(d.level)}>
              <title>{d.k}</title>
            </rect>
          )
        )))}
      </svg>
      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6 }}>
        <span style={{ color: "var(--c-ember)" }}>■</span> trained ·{" "}
        <span style={{ color: "color-mix(in srgb, var(--c-good) 55%, var(--card2))" }}>■</span> logged · rows Mon→Sun
      </div>
    </Card>
  );
}
