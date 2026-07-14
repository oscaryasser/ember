import { useMemo } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { num } from "../lib/util.js";
import { LineChart } from "../components/charts.jsx";
import Heatmap from "../features/Heatmap.jsx";
import StrengthProgress from "../features/StrengthProgress.jsx";
import PullupProgress from "../features/PullupProgress.jsx";
import Measurements from "../features/Measurements.jsx";
import Photos from "../features/Photos.jsx";

export default function Progress({ data, update }) {
  const goals = data.goals;

  const weights = useMemo(
    () =>
      Object.entries(data.days)
        .filter(([, d]) => num(d.weight) !== null)
        .map(([k, d]) => ({ k, v: num(d.weight) }))
        .sort((a, b) => (a.k < b.k ? -1 : 1)),
    [data]
  );

  const runs = useMemo(
    () =>
      Object.entries(data.days)
        .filter(([, d]) => num(d.runDistance) !== null && num(d.runMins) !== null && num(d.runDistance) > 0)
        .map(([k, d]) => ({ k, dist: num(d.runDistance), mins: num(d.runMins), pace: num(d.runMins) / num(d.runDistance), week: d.runWeek }))
        .sort((a, b) => (a.k < b.k ? -1 : 1)),
    [data]
  );

  const target = num(goals.targetWeight);
  const wDelta = weights.length >= 2 ? weights[weights.length - 1].v - weights[0].v : null;
  const last = weights.length ? weights[weights.length - 1].v : null;
  const toGo = target !== null && last !== null ? last - target : null;

  const fmtPace = (p) => `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, "0")}`;

  return (
    <div className="fade-in">
      <Card>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <SectionLabel>Weight</SectionLabel>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</span>
            <input inputMode="decimal" placeholder="lbs" value={goals.targetWeight || ""}
              onChange={(e) => update((d) => ({ ...d, goals: { ...d.goals, targetWeight: e.target.value.replace(/[^0-9.]/g, "") } }))}
              style={{ width: 72, padding: "7px 8px", fontSize: 15, textAlign: "center" }} />
          </div>
        </div>
        {weights.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--dim)" }}>
            Log a weigh-in on the Today tab (1–2× per week is plenty). Set your target above and the graph builds itself.
          </div>
        ) : (
          <>
            <div className="row" style={{ alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <div className="display" style={{ fontSize: 32, fontWeight: 700 }}>{last}<span style={{ fontSize: 15, color: "var(--dim)" }}> lbs</span></div>
              {wDelta !== null && (
                <div className="display" style={{ fontSize: 19, fontWeight: 700, color: wDelta <= 0 ? "var(--good)" : "var(--bad)" }}>
                  {wDelta <= 0 ? "" : "+"}{wDelta.toFixed(1)} since start
                </div>
              )}
              {toGo !== null && toGo > 0 && <div className="display" style={{ fontSize: 19, fontWeight: 700, color: "var(--ember)" }}>{toGo.toFixed(1)} to go</div>}
              {toGo !== null && toGo <= 0 && <div className="display" style={{ fontSize: 19, fontWeight: 700, color: "var(--good)" }}>🎯 target reached</div>}
            </div>
            <LineChart pts={weights.slice(-24)} target={target} color="var(--c-ember)" />
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
              Judge the trend line, not single weigh-ins — daily water swings are 2–4 lbs of noise.
            </div>
          </>
        )}
      </Card>

      <Heatmap data={data} />

      <Card style={{ marginTop: 12 }}>
        <SectionLabel>Run pace · from your Garmin</SectionLabel>
        {runs.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--dim)" }}>
            After each run, type distance + time from your watch into the run card. Pace charts here across the 10 weeks.
          </div>
        ) : (
          <>
            <div className="row" style={{ alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <div className="display" style={{ fontSize: 32, fontWeight: 700 }}>
                {fmtPace(runs[runs.length - 1].pace)}<span style={{ fontSize: 15, color: "var(--dim)" }}> /mi last run</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--dim)" }}>
                {runs[runs.length - 1].dist} mi · {runs.length} run{runs.length === 1 ? "" : "s"} logged
              </div>
            </div>
            {runs.length >= 2 ? (
              <>
                <LineChart pts={runs.slice(-20).map((r) => ({ k: r.k, v: r.pace }))} color="var(--c-fuel)" height={110} yFmt={fmtPace} />
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
                  Lower = faster. Expect pace to drop as jog blocks get longer — that's the plan working.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--dim)" }}>One run logged — the trend starts at two.</div>
            )}
          </>
        )}
      </Card>

      <StrengthProgress data={data} />
      <PullupProgress data={data} goals={goals} />
      <Measurements data={data} update={update} />
      <Photos />
    </div>
  );
}
