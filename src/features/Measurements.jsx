import { useMemo, useState } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { MEASUREMENT_FIELDS } from "../plan.js";
import { num, sanitizeDecimal } from "../lib/util.js";
import { todayKey, shortDate } from "../lib/dates.js";
import { LineChart } from "../components/charts.jsx";

// Body measurements, logged occasionally, stored on the day record so they
// travel inside the normal JSON backup.
export default function Measurements({ data, update }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [chartField, setChartField] = useState("waist");

  const history = useMemo(() => {
    const out = {};
    MEASUREMENT_FIELDS.forEach((f) => (out[f.id] = []));
    Object.entries(data.days)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .forEach(([k, d]) => {
        const m = d.measurements;
        if (!m) return;
        MEASUREMENT_FIELDS.forEach((f) => {
          const v = num(m[f.id]);
          if (v !== null) out[f.id].push({ k, v });
        });
      });
    return out;
  }, [data]);

  const saveToday = () => {
    const key = todayKey();
    const vals = {};
    let any = false;
    MEASUREMENT_FIELDS.forEach((f) => {
      const v = num(drafts[f.id]);
      if (v !== null) { vals[f.id] = drafts[f.id]; any = true; }
    });
    if (!any) return;
    update((d) => {
      const day = d.days[key] || {};
      return {
        ...d,
        days: { ...d.days, [key]: { ...day, measurements: { ...(day.measurements || {}), ...vals } } },
      };
    });
    setDrafts({});
    setOpen(false);
  };

  const pts = history[chartField] || [];
  const latestByField = MEASUREMENT_FIELDS.map((f) => {
    const h = history[f.id];
    return { ...f, latest: h.length ? h[h.length - 1] : null, delta: h.length >= 2 ? h[h.length - 1].v - h[0].v : null };
  });

  return (
    <Card style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <SectionLabel>Body measurements</SectionLabel>
        <button className="btn" style={{ fontSize: 12, padding: "5px 10px", marginBottom: 10 }} onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "+ Log today"}
        </button>
      </div>

      {open && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {MEASUREMENT_FIELDS.map((f) => (
              <div key={f.id} style={{ flex: "1 1 30%", minWidth: 90 }}>
                <div className="field-label">{f.label} <span className="unit">in</span></div>
                <input inputMode="decimal" placeholder="—" value={drafts[f.id] || ""}
                  onChange={(e) => setDrafts((s) => ({ ...s, [f.id]: sanitizeDecimal(e.target.value) }))} />
              </div>
            ))}
          </div>
          <button className="btn primary" style={{ width: "100%", marginTop: 10 }} onClick={saveToday}>
            Save measurements for today
          </button>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6 }}>
            Fill only what you measured — tape at the same spots, relaxed, every 2–4 weeks.
          </div>
        </div>
      )}

      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {latestByField.map((f) => (
          <button key={f.id}
            onClick={() => setChartField(f.id)}
            style={{
              flex: "1 1 18%", minWidth: 58, textAlign: "center", padding: "7px 4px", borderRadius: 10,
              background: chartField === f.id ? "color-mix(in srgb, var(--fuel) 15%, transparent)" : "var(--card2)",
              border: `1px solid ${chartField === f.id ? "var(--fuel)" : "var(--line)"}`,
            }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: chartField === f.id ? "var(--fuel)" : "var(--dim)" }}>{f.label}</div>
            <div className="display" style={{ fontSize: 16, fontWeight: 700 }}>{f.latest ? f.latest.v : "—"}</div>
            {f.delta !== null && (
              <div style={{ fontSize: 10, fontWeight: 700, color: f.delta <= 0 ? "var(--good)" : "var(--ember)" }}>
                {f.delta > 0 ? "+" : ""}{f.delta.toFixed(1)}
              </div>
            )}
          </button>
        ))}
      </div>

      {pts.length >= 2 ? (
        <>
          <LineChart pts={pts} color="var(--c-fuel)" height={110} yFmt={(v) => v.toFixed(1)} />
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
            {MEASUREMENT_FIELDS.find((f) => f.id === chartField)?.label} · {pts[0].v}″ ({shortDate(pts[0].k)}) → {pts[pts.length - 1].v}″ ({shortDate(pts[pts.length - 1].k)})
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: "var(--dim)" }}>
          Log {pts.length ? "one more session" : "two sessions"} of {MEASUREMENT_FIELDS.find((f) => f.id === chartField)?.label.toLowerCase()} to see the trend. Waist down + weight flat = recomp working.
        </div>
      )}
    </Card>
  );
}
