import { Card, SectionLabel } from "../components/ui.jsx";
import { RUN_WEEKS, STRENGTH } from "../plan.js";
import WeekPlanner from "../features/WeekPlanner.jsx";

export default function Plan({ data, update }) {
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

      {update && <WeekPlanner data={data} update={update} />}

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
          After Week 10 (or any day you want something different) the timer also does custom intervals and free-duration runs.
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
        <SectionLabel color="var(--good)">Pull-up program · grease the groove</SectionLabel>
        <div style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 10 }}>
          Runs <b>beside</b> the A/B sessions, not inside them — <b>{goals.pullupDays} days a week</b>, easy sets spread
          through the day, <b>never to failure</b>. Grips rotate <b>chin → neutral → wide</b> one day each, so every angle
          gets trained and nothing gets overused. Strength grows from frequency, not from grinding.
        </div>
        {[
          ["Test day", "No max on file (or 10+ days old): one honest max set of strict chin-ups, replacing that day's easy sets. Zero is a valid score — it just picks your level."],
          ["Foundation — max 0", "5 × 3 slow negatives (jump up, 5 s down) or 5 × 5 band-assisted reps."],
          ["Groove — max 1–3", "6 easy sets of half your max (min 1), spread through the day."],
          ["Volume — max 4–7", "5 easy sets of ~50% of max — always crisp."],
          ["Density — max 8+", "5 sets of ~60% of max; make one set weighted once a week."],
        ].map(([name, txt], i) => (
          <div key={name} className="row" style={{ gap: 12, padding: "8px 0", borderTop: i ? "1px solid var(--line)" : "none", alignItems: "baseline" }}>
            <div className="display" style={{ fontWeight: 700, fontSize: 15, color: "var(--good)", width: 118, flexShrink: 0 }}>{name}</div>
            <div style={{ fontSize: 13, color: "var(--dim)" }}>{txt}</div>
          </div>
        ))}
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 8 }}>
          Rules: stop every set 2+ reps short of failure · 15+ min between sets beats one block · on lift days 2–3 easy
          sets is plenty · retest each grip every ~10 days · sore elbows = rest day. Target: {goals.pullupTarget} strict reps.
        </div>
      </Card>

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
