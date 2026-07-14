import { useState } from "react";
import { Card, SectionLabel, Seg } from "../components/ui.jsx";
import { num, sanitizeInt } from "../lib/util.js";
import { unlockAudio, cues } from "../lib/audio.js";
import {
  GRIPS, GRIP_ORDER, ASSISTS, pullupSets, pullupVolume, suggestedGrip,
  workingMax, prescription, testDue, daysSinceTest, bestTestBefore,
  weekPullupDays, TEST_EVERY_DAYS,
} from "../lib/pullups.js";

// Daily grease-the-groove pull-up card. Deliberately separate from the A/B
// strength sessions — it doesn't touch activities or the weekly session count.
export default function PullupCard({ data, day, setDay, dateKey, goals }) {
  const sets = pullupSets(day);
  const [collapsed, setCollapsed] = useState(sets.length === 0);
  const [gripSel, setGripSel] = useState(null);
  const [assist, setAssist] = useState("full");
  const [repsDraft, setRepsDraft] = useState(null); // null → prescribed default
  const [testOpen, setTestOpen] = useState(false);
  const [testReps, setTestReps] = useState("");
  const [testGrip, setTestGrip] = useState(null);
  const [pr, setPr] = useState(null);

  const sugg = suggestedGrip(data, dateKey);
  const grip = gripSel || sugg;
  const wm = workingMax(data, grip);
  const rx = prescription(wm ? wm.reps : null);
  const vol = pullupVolume(day);
  const weekDays = weekPullupDays(data, dateKey);
  const daysGoal = Math.max(1, Math.round(num(goals.pullupDays) ?? 5));

  const defaultReps = assist === "neg" ? 3 : assist === "band" ? 5 : Math.max(1, rx.reps ?? 3);
  const reps = repsDraft ?? defaultReps;

  const patchPullups = (patch) => setDay({ pullups: { ...(day.pullups || {}), ...patch } });

  const logSet = () => {
    if (!reps || reps <= 0) return;
    unlockAudio();
    patchPullups({ sets: [...sets, { grip, reps, assist }] });
    setRepsDraft(null);
  };
  const removeSet = (i) => patchPullups({ sets: sets.filter((_, x) => x !== i) });

  const anyTestDue = GRIP_ORDER.some((g) => testDue(data, g, dateKey));
  const saveTest = () => {
    const r = num(testReps);
    if (r === null || r < 0) return;
    unlockAudio();
    const g = testGrip || grip;
    const prevBest = bestTestBefore(data, g, dateKey);
    patchPullups({ test: { grip: g, reps: r } });
    setTestOpen(false);
    setTestReps("");
    if (prevBest !== null && r > prevBest) {
      setPr({ grip: g, reps: r, old: prevBest });
      cues.pr();
      setTimeout(() => setPr(null), 3500);
    }
  };

  const status =
    sets.length > 0
      ? `${vol} reps · ${sets.length} set${sets.length === 1 ? "" : "s"} ${collapsed ? "▾" : "▴"}`
      : wm
        ? `${GRIPS[sugg].short} day · ${rx.level} ${collapsed ? "▾" : "▴"}`
        : `start here — test your max ${collapsed ? "▾" : "▴"}`;

  return (
    <Card style={{ marginTop: 16, borderColor: sets.length ? "color-mix(in srgb, var(--good) 40%, var(--line))" : undefined }}>
      {pr && (
        <div className="pr-toast" onClick={() => setPr(null)}>
          <div style={{ fontSize: 26 }}>🏆</div>
          <div className="display" style={{ fontSize: 20, fontWeight: 700, color: "var(--good)" }}>
            PR — {GRIPS[pr.grip].label}
          </div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>
            {pr.reps} strict reps (was {pr.old})
          </div>
        </div>
      )}

      <button className="row" style={{ width: "100%", justifyContent: "space-between", textAlign: "left" }}
        onClick={() => setCollapsed((c) => !c)}>
        <SectionLabel>Pull-ups · every day</SectionLabel>
        <div style={{ fontSize: 13, fontWeight: 700, color: sets.length ? "var(--good)" : "var(--dim)", marginBottom: 10 }}>
          {status}
        </div>
      </button>

      {!collapsed && (
        <div>
          {/* prescription */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, color: "var(--ember)" }}>
              {rx.level}
              {wm && <span style={{ fontSize: 14, color: "var(--dim)", fontWeight: 600 }}> · max {wm.reps} {GRIPS[wm.grip].short.toLowerCase()}{wm.exact ? "" : " (retest this grip)"}</span>}
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, margin: "2px 0 2px" }}>{rx.scheme}</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 10 }}>{rx.why}</div>

          {/* grip rotation */}
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <Seg
              options={GRIP_ORDER.map((g) => [g, GRIPS[g].short + (g === sugg ? " ●" : "")])}
              value={grip}
              onChange={(g) => { setGripSel(g); setRepsDraft(null); }}
            />
            <Seg options={ASSISTS} value={assist} activeColor="var(--fuel)"
              onChange={(a) => { setAssist(a); setRepsDraft(null); }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 10 }}>
            ● = today in the chin → neutral → wide rotation. {GRIPS[grip].label}: {GRIPS[grip].hint}.
          </div>

          {/* one-tap set logging */}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ width: 44, fontSize: 17, fontWeight: 800 }}
              onClick={() => setRepsDraft(Math.max(1, reps - 1))}>−</button>
            <div className="display" style={{ fontSize: 24, fontWeight: 700, width: 46, textAlign: "center" }}>{reps}</div>
            <button className="btn" style={{ width: 44, fontSize: 17, fontWeight: 800 }}
              onClick={() => setRepsDraft(reps + 1)}>+</button>
            <button className="btn primary grow" style={{ fontWeight: 800 }} onClick={logSet}>
              ✓ Log set · {reps} {assist === "neg" ? "negatives" : assist === "band" ? "band reps" : GRIPS[grip].short.toLowerCase()}
            </button>
          </div>

          {sets.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {sets.map((s, i) => (
                <div key={i} style={{ background: "var(--card2)", borderRadius: 8, padding: "4px 8px", fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                  {s.reps} {GRIPS[s.grip]?.short.toLowerCase() || s.grip}{s.assist === "band" ? " (band)" : s.assist === "neg" ? " (neg)" : ""}
                  <button onClick={() => removeSet(i)} aria-label={`Remove set ${i + 1}`} style={{ color: "var(--dim)", fontWeight: 700 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* week progress vs goal */}
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10, color: weekDays >= daysGoal ? "var(--good)" : "var(--text)" }}>
            {weekDays}/{daysGoal} pull-up days this week{weekDays >= daysGoal ? " ✓" : ""}
            {vol > 0 && <span style={{ color: "var(--dim)", fontWeight: 600 }}> · {vol} reps today</span>}
          </div>

          {/* max test */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
            {!testOpen ? (
              <>
                <button className="btn" style={{ width: "100%", ...(anyTestDue && sets.length === 0 ? { borderColor: "var(--ember)", color: "var(--ember)", fontWeight: 800 } : {}) }}
                  onClick={() => { setTestGrip(grip); setTestOpen(true); }}>
                  {!wm ? "Set your level — log one honest max set"
                    : anyTestDue ? (sets.length ? "⏱ Retest due — next fresh day" : "⏱ Max test due — log today's max")
                    : "Log a max test"}
                  {!anyTestDue && daysSinceTest(data, grip, dateKey) !== null &&
                    ` (${GRIPS[grip].short.toLowerCase()} retest in ${Math.max(0, TEST_EVERY_DAYS - daysSinceTest(data, grip, dateKey))}d)`}
                </button>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 5 }}>
                  The test <b>replaces</b> that day's easy sets — never do both. Already did your sets today? It waits.
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  One honest max set <span style={{ color: "var(--ember)" }}>instead of</span> today's easy sets — fresh, full rest, stop when form breaks.
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <Seg options={GRIP_ORDER.map((g) => [g, GRIPS[g].short])} value={testGrip || grip} onChange={setTestGrip} />
                  <input inputMode="numeric" placeholder="max reps" value={testReps}
                    onChange={(e) => setTestReps(sanitizeInt(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && saveTest()}
                    style={{ width: 90, fontSize: 17, padding: 8, textAlign: "center" }} />
                  <button className="btn primary" style={{ fontWeight: 800 }} disabled={num(testReps) === null} onClick={saveTest}>Save</button>
                  <button className="btn" onClick={() => setTestOpen(false)}>Cancel</button>
                </div>
              </div>
            )}
            {day.pullups?.test && (
              <div style={{ fontSize: 12, color: "var(--good)", fontWeight: 700, marginTop: 6 }}>
                ✓ Tested today: {day.pullups.test.reps} {GRIPS[day.pullups.test.grip]?.short.toLowerCase()}
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
            Never to failure — stop 2+ reps in the tank. Space sets through the day (15+ min apart beats one block).
            On lift days 2–3 easy sets is plenty. Sore elbows or shoulders → take the rest day.
          </div>
        </div>
      )}
    </Card>
  );
}
