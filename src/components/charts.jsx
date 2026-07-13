import { shortDate } from "../lib/dates.js";

// Generic time-series line chart with optional dashed target line.
// pts: [{ k: dateKey, v: number }] sorted ascending. Single series — no legend
// needed; the surrounding card title names it. Direct labels: latest value big
// above the chart, first/last dates on the axis, target labeled on its line.
export function LineChart({ pts, target = null, color = "var(--c-ember)", height = 130, unit = "", yFmt = (v) => Math.round(v) }) {
  if (!pts.length) return null;
  const W = 320, H = height, padL = 36, padR = 10, padT = 10, padB = 20;
  const ys = pts.map((p) => p.v).concat(target !== null ? [target] : []);
  let yMin = Math.min(...ys), yMax = Math.max(...ys);
  const span = yMax - yMin || 1;
  yMin -= span * 0.12; yMax += span * 0.12;
  const X = (i) => padL + (pts.length === 1 ? (W - padL - padR) / 2 : (i / (pts.length - 1)) * (W - padL - padR));
  const Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const grid = [yMax, (yMax + yMin) / 2, yMin];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {grid.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={padL - 5} y={Y(v) + 3.5} textAnchor="end" fontSize="9" fill="var(--dim)">{yFmt(v)}</text>
        </g>
      ))}
      {target !== null && (
        <g>
          <line x1={padL} x2={W - padR} y1={Y(target)} y2={Y(target)} stroke="var(--c-good)" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={W - padR} y={Y(target) - 4} textAnchor="end" fontSize="9" fontWeight="700" fill="var(--c-good)">target {yFmt(target)}{unit}</text>
        </g>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={p.k} cx={X(i)} cy={Y(p.v)} r={i === pts.length - 1 ? 4 : 2.4}
          fill={i === pts.length - 1 ? color : "var(--card)"} stroke={color} strokeWidth="1.5" />
      ))}
      <text x={X(0)} y={H - 4} fontSize="9" fill="var(--dim)">{shortDate(pts[0].k)}</text>
      {pts.length > 1 && (
        <text x={X(pts.length - 1)} y={H - 4} textAnchor="end" fontSize="9" fill="var(--dim)">{shortDate(pts[pts.length - 1].k)}</text>
      )}
    </svg>
  );
}

// Diverging daily-balance bars around a zero baseline. Deficit (good) hangs
// below, surplus (bad) rises above — position + legend carry meaning, color
// reinforces it (status colors, never identity).
export function BalanceBars({ items, maxAbs }) {
  const cap = Math.max(maxAbs, 600);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 4, height: 140 }}>
        {items.map(({ k, net, trained, label }) => {
          const h = net === null ? 0 : Math.min(56, (Math.abs(net) / cap) * 56);
          const deficit = net !== null && net < 0;
          return (
            <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", alignItems: "center" }}>
                <div style={{ height: 56, display: "flex", alignItems: "flex-end", width: "68%" }}>
                  {!deficit && net !== null && <div style={{ width: "100%", height: h, background: "var(--c-bad)", borderRadius: 4 }} />}
                </div>
                <div style={{ height: 1.5, width: "100%", background: "var(--line)" }} />
                <div style={{ height: 56, display: "flex", alignItems: "flex-start", width: "68%" }}>
                  {deficit && <div style={{ width: "100%", height: h, background: "var(--c-good)", borderRadius: 4 }} />}
                  {net === null && <div style={{ width: "100%", height: 4, background: "var(--card2)", borderRadius: 3, marginTop: 2 }} />}
                </div>
              </div>
              <div style={{ fontSize: 9, color: "var(--dim)", marginTop: 3 }}>{label}</div>
              <div style={{ fontSize: 10, height: 12, color: "var(--dim)" }}>{trained ? "●" : ""}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center" }}>
        <span style={{ color: "var(--c-good)" }}>■</span> below the line = deficit ·{" "}
        <span style={{ color: "var(--c-bad)" }}>■</span> above = surplus · ● = trained
      </div>
    </>
  );
}

// Tiny inline trend line for stat tiles.
export function Sparkline({ pts, color = "var(--c-fuel)", width = 120, height = 34 }) {
  const vals = pts.filter((v) => v !== null && v !== undefined);
  if (vals.length < 2) return <div style={{ height }} />;
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mx === mn) { mx += 1; mn -= 1; }
  let li = -1;
  const coords = pts.map((v, i) => {
    if (v === null || v === undefined) return null;
    li = i;
    const x = 2 + (i / (pts.length - 1)) * (width - 4);
    const y = 3 + (1 - (v - mn) / (mx - mn)) * (height - 6);
    return [x, y];
  });
  let d = "", pen = false;
  coords.forEach((c) => {
    if (!c) { pen = false; return; }
    d += `${pen ? "L" : "M"}${c[0].toFixed(1)},${c[1].toFixed(1)}`;
    pen = true;
  });
  const last = coords[li];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={last[0]} cy={last[1]} r="3" fill={color} />}
    </svg>
  );
}
