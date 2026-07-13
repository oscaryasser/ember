import { useMemo, useState } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { exerciseHistory, loggedExercises } from "../lib/strength.js";
import { round1 } from "../lib/util.js";
import { shortDate } from "../lib/dates.js";
import { LineChart } from "../components/charts.jsx";

// Per-exercise estimated-1RM trend with PR badge.
export default function StrengthProgress({ data }) {
  const exercises = useMemo(() => loggedExercises(data), [data]);
  const [sel, setSel] = useState(null);
  const active = sel || exercises[0]?.name || null;
  const hist = useMemo(() => (active ? exerciseHistory(data, active) : []), [data, active]);

  const weighted = hist.filter((h) => h.best > 0);
  const pts = weighted.map((h) => ({ k: h.k, v: h.best }));
  const best = weighted.length ? Math.max(...weighted.map((h) => h.best)) : 0;
  const latest = weighted[weighted.length - 1];
  const isPR = latest && latest.best >= best && weighted.length >= 2;

  return (
    <Card style={{ marginTop: 12 }}>
      <SectionLabel>Strength progression · est. 1RM</SectionLabel>
      {exercises.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--dim)" }}>
          Log weight × reps on your strength exercises and each one charts here — with a 🏆 when you beat your best.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
            {exercises.map((ex) => (
              <button key={ex.name}
                onClick={() => setSel(ex.name)}
                style={{
                  flexShrink: 0, padding: "7px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: active === ex.name ? "color-mix(in srgb, var(--ember) 15%, transparent)" : "var(--card2)",
                  border: `1px solid ${active === ex.name ? "var(--ember)" : "var(--line)"}`,
                  color: active === ex.name ? "var(--ember)" : "var(--dim)",
                }}>
                {ex.name}
              </button>
            ))}
          </div>

          {pts.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--dim)" }}>
              Only bodyweight sets logged for this one — add load to start an e1RM trend.
            </div>
          ) : (
            <>
              <div className="row" style={{ alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <div className="display" style={{ fontSize: 30, fontWeight: 700 }}>
                  {round1(latest.best)}<span style={{ fontSize: 14, color: "var(--dim)" }}> lbs e1RM</span>
                </div>
                {isPR && (
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--good)", background: "color-mix(in srgb, var(--good) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--good) 40%, transparent)", borderRadius: 999, padding: "3px 10px" }}>
                    🏆 all-time best
                  </div>
                )}
                {!isPR && best > 0 && (
                  <div style={{ fontSize: 13, color: "var(--dim)" }}>best {round1(best)}</div>
                )}
              </div>
              {pts.length >= 2 ? (
                <LineChart pts={pts} color="var(--c-ember)" height={110} yFmt={(v) => Math.round(v)} />
              ) : (
                <div style={{ fontSize: 13, color: "var(--dim)" }}>One session logged ({shortDate(pts[0].k)}) — the line starts at two.</div>
              )}
              <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
                e1RM = weight × (1 + reps/30) (Epley), best set of each session. Top set today: {latest.topW ? `${latest.topW} lbs` : "bodyweight"}.
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
