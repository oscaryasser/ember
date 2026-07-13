import { Card, SectionLabel } from "../components/ui.jsx";
import { RUN_WEEKS, STRENGTH } from "../plan.js";

export default function Plan({ data }) {
  const goals = data.goals;
  return (
    <div className="fade-in">
      <Card>
        <SectionLabel color="var(--ember)">How this plan flexes</SectionLabel>
        <div style={{ fontSize: 15, lineHeight: 1.55 }}>
          No fixed days. Hit <b>{goals.weeklyRuns} runs + {goals.weeklyStrength} strength sessions per week</b>, in any order.
          Rules of thumb: keep ~48h between runs, alternate A and B, and if you stack a run + lift on one day, lift first or split morning/evening.
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <SectionLabel color="var(--ember)">Zero → 30 min running · 10 weeks</SectionLabel>
        {Object.entries(RUN_WEEKS).map(([k, w]) => (
          <div key={k} className="row" style={{ gap: 12, padding: "9px 0", borderTop: k > 1 ? "1px solid var(--line)" : "none", alignItems: "baseline" }}>
            <div className="display" style={{ fontWeight: 700, fontSize: 17, color: parseInt(k) === data.runWeek ? "var(--ember)" : "var(--dim)", width: 34, flexShrink: 0 }}>
              W{k}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{w.protocol}</div>
              <div style={{ fontSize: 13, color: "var(--dim)" }}>{w.detail}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 8 }}>
          Every run: 5 min brisk walk warmup + 5 min cooldown. Repeat any week that felt hard. The guided timer beeps you through every switch.
        </div>
      </Card>

      {["A", "B"].map((id) => (
        <Card key={id} style={{ marginTop: 12 }}>
          <SectionLabel color="var(--fuel)">{STRENGTH[id].name}</SectionLabel>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {["home", "gym"].map((m) => (
              <div key={m} style={{ flex: "1 1 45%", minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {m === "home" ? "🏠 Home (bands + vest)" : "🏋️ Gym"}
                </div>
                {[...STRENGTH[id][m], ...(((data.custom || {})[id] || {})[m] || [])].map((ex, i) => (
                  <div key={i} style={{ fontSize: 13, color: "var(--dim)", padding: "4px 0" }}>
                    {ex}
                    {i >= STRENGTH[id][m].length && <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 5 }}>MINE</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card style={{ marginTop: 12 }}>
        <SectionLabel>Nutrition anchors</SectionLabel>
        <div style={{ fontSize: 15, lineHeight: 1.6 }}>
          Eat <b style={{ color: "var(--fuel)" }}>2,000–2,200 kcal/day</b> to start, then trust the app's real numbers over the estimate.
          Protein <b>{goals.protein}–{goals.protein + 20} g/day</b> — this is what makes it recomp instead of just weight loss.
          Weigh in 1–2× per week, same conditions. Expect ~1 lb/week down; if 2+ weeks stall, trim 100–150 kcal.
        </div>
      </Card>
    </div>
  );
}
