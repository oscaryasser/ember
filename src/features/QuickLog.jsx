import { useState } from "react";
import { num, sanitizeDecimal, proteinOf, intakeOf } from "../lib/util.js";
import { todayKey } from "../lib/dates.js";
import { getDay, patchDay } from "../store.jsx";
import { suggestedGrip, workingMax, prescription, GRIPS } from "../lib/pullups.js";
import { unlockAudio } from "../lib/audio.js";

// Floating ⊕: log the four most common things to TODAY from anywhere, two
// taps, no scrolling. Everything routes through the same day-patch path the
// cards use.
export default function QuickLog({ data, update }) {
  const [open, setOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");
  const [flash, setFlash] = useState(null);

  const key = todayKey();
  const day = getDay(data, key);
  const setDay = patchDay(update, key);

  const done = (msg) => {
    setFlash(msg);
    setTimeout(() => { setFlash(null); setOpen(false); }, 700);
  };

  const addProtein = (g) => {
    const entries = day.proteinEntries || [];
    const migrated = entries.length === 0 && num(day.protein) ? [num(day.protein)] : entries;
    setDay({ proteinEntries: [...migrated, g], protein: "" });
    done(`+${g}g protein · ${Math.round(proteinOf(day) + g)}g today`);
  };

  const logFood = (f) => {
    setDay({ meals: [...(day.meals || []), { foodId: f.id, name: f.name, qty: 1, kcal: num(f.kcal) || 0, p: num(f.p) || 0, c: num(f.c) || 0, f: num(f.f) || 0 }] });
    update((d) => ({ ...d, foods: (d.foods || []).map((x) => (x.id === f.id ? { ...x, lastUsed: Date.now() } : x)) }));
    done(`${f.name} logged · ${Math.round((intakeOf(day) || 0) + (num(f.kcal) || 0))} kcal in`);
  };

  const saveWeight = () => {
    if (num(weightDraft) === null) return;
    setDay({ weight: weightDraft });
    setWeightDraft("");
    done(`⚖️ ${weightDraft} lbs saved`);
  };

  const grip = suggestedGrip(data, key);
  const wm = workingMax(data, grip);
  const rx = prescription(wm ? wm.reps : null);
  const pullReps = Math.max(1, rx.reps ?? 3);
  const logPullups = () => {
    unlockAudio();
    setDay({ pullups: { ...(day.pullups || {}), sets: [...(day.pullups?.sets || []), { grip, reps: pullReps, assist: "full" }] } });
    done(`+${pullReps} ${GRIPS[grip].short.toLowerCase()} · set ${(day.pullups?.sets || []).length + 1}`);
  };

  const recentFoods = [...(data.foods || [])].sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).slice(0, 4);

  return (
    <>
      <button className="fab" aria-label="Quick log" onClick={() => setOpen((o) => !o)}>
        {open ? "×" : "+"}
      </button>

      {open && (
        <>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="sheet fade-in">
            {flash ? (
              <div style={{ textAlign: "center", padding: "26px 0", fontSize: 16, fontWeight: 800, color: "var(--good)" }}>✓ {flash}</div>
            ) : (
              <>
                <div className="section-label">Quick log → today</div>

                {recentFoods.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="field-label">Food</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {recentFoods.map((f) => (
                        <button key={f.id} className="btn" style={{ fontSize: 13, fontWeight: 700 }} onClick={() => logFood(f)}>
                          {f.name} <span style={{ color: "var(--dim)", fontWeight: 400 }}>{f.kcal}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div className="field-label">Protein</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[10, 20, 30, 40].map((g) => (
                      <button key={g} className="btn grow" style={{ fontWeight: 800 }} onClick={() => addProtein(g)}>+{g}g</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="field-label">Weigh-in</div>
                  <div className="row" style={{ gap: 6 }}>
                    <input inputMode="decimal" placeholder={day.weight || "lbs"} value={weightDraft}
                      onChange={(e) => setWeightDraft(sanitizeDecimal(e.target.value))}
                      onKeyDown={(e) => e.key === "Enter" && saveWeight()}
                      style={{ fontSize: 17, padding: "9px 10px", textAlign: "center", width: 100 }} />
                    <button className="btn primary grow" style={{ fontWeight: 800 }} disabled={num(weightDraft) === null} onClick={saveWeight}>Save</button>
                  </div>
                </div>

                <div>
                  <div className="field-label">Pull-ups</div>
                  <button className="btn" style={{ width: "100%", fontWeight: 800 }} onClick={logPullups}>
                    + Set of {pullReps} {GRIPS[grip].short.toLowerCase()}
                    <span style={{ color: "var(--dim)", fontWeight: 400 }}> · today's grip</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
