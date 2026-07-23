import { useMemo, useState } from "react";
import { STRENGTH, sessionList, substitutesFor, movementLabel } from "../plan.js";
import { num, round1, e1rm, sanitizeDecimal, sanitizeInt } from "../lib/util.js";
import { lastSetsFor, buildSetPatch, bestBefore } from "../lib/strength.js";
import { plateBreakdown, warmupRamp, BAR } from "../lib/plates.js";
import { fmtClock } from "../lib/dates.js";
import { unlockAudio, cues } from "../lib/audio.js";
import { keepAwake, releaseAwake } from "../lib/wakeLock.js";
import { useRestTimer } from "./RestTimer.jsx";

// Gym Mode: one exercise at a time, huge targets, the rest timer and plate
// math on-screen — the run timer's philosophy applied to lifting.
export default function GymMode({ id, data, day, setDay, update, dateKey, onClose }) {
  const modeKey = "mode" + id;
  const mode = day[modeKey] || "home";
  const custom = ((data.custom || {})[id] || {})[mode] || [];
  const base = sessionList(STRENGTH, day, id, mode);
  const list = [...base, ...custom];
  const { startRest, restRemaining, restActive, addRest, stopRest } = useRestTimer();

  const [idx, setIdx] = useState(0);
  const [wDraft, setWDraft] = useState("");
  const [rDraft, setRDraft] = useState("");
  const [pr, setPr] = useState(null);
  const [prs, setPrs] = useState([]);
  const [ended, setEnded] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const goTo = (i) => { setIdx(i); setWDraft(""); setRDraft(""); setSwapOpen(false); };
  const setSwap = (i, val) => {
    const forId = { ...((day.swaps || {})[id] || {}) };
    if (val === null) delete forId[i]; else forId[i] = val;
    setDay({ swaps: { ...(day.swaps || {}), [id]: forId } });
    setSwapOpen(false);
  };
  const removeExercise = (i) => update?.((d) => {
    const c = (d.hidden || {})[id] || [];
    return { ...d, hidden: { ...(d.hidden || {}), [id]: [...new Set([...c, i])] } };
  });

  useMemo(() => { keepAwake(); }, []);
  const close = () => { releaseAwake(); onClose(); };

  // Skip removed (hidden) base exercises: page over the visible list, but keep
  // each item's original index for checks/sets/swaps.
  const hidden = (data.hidden || {})[id] || [];
  const visible = list.map((ex, i) => ({ ex, i, isCustom: i >= base.length })).filter((v) => v.isCustom || !hidden.includes(v.i));
  const pos = Math.min(idx, Math.max(0, visible.length - 1));
  const cur = visible[pos] || { ex: list[0] || "—", i: 0, isCustom: false };
  const ex = cur.ex;
  const origIdx = cur.i;
  const exName = ex.split("—")[0].trim();
  const scheme = ex.split("—")[1]?.trim() || "";
  const todaySets = ((day.sets || {})[id] || {})[exName] || [];
  const workSets = todaySets.filter((s) => !s.warm);
  const last = lastSetsFor(data, id, exName, dateKey);
  const lastMaxReps = last ? Math.max(...last.sets.map((s) => s.r)) : 0;
  const lastTopW = last ? Math.max(...last.sets.map((s) => s.w || 0)) : 0;
  const prevSets = last?.sets || [];                  // last session's working sets
  const bestPrev = bestBefore(data, exName, dateKey); // all-time best e1RM to beat

  const wNum = num(wDraft) ?? (workSets.length ? workSets[workSets.length - 1].w : lastTopW || null);
  const plates = plateBreakdown(wNum);
  const onBase = !cur.isCustom;
  const ramp = workSets.length === 0 && (wNum || 0) > BAR + 10 ? warmupRamp(wNum) : null;
  const subs = swapOpen && onBase ? substitutesFor(exName, mode) : null;

  const workingOf = (arr) => arr.filter((s) => !s.warm);
  const totalSets = Object.values((day.sets || {})[id] || {}).reduce((a, s) => a + workingOf(s).length, 0);
  const volume = Object.values((day.sets || {})[id] || {}).reduce((a, s) => a + workingOf(s).reduce((x, y) => x + (y.w || 0) * y.r, 0), 0);

  // Remove a logged set (working or warm-up) mid-workout, by its real index.
  const removeSetAt = (fullIdx) => {
    const arr = ((day.sets || {})[id] || {})[exName] || [];
    const sets = { ...(day.sets || {}) };
    sets[id] = { ...(sets[id] || {}) };
    sets[id][exName] = arr.filter((_, x) => x !== fullIdx);
    setDay({ sets });
  };
  // Log a warm-up set directly (from a suggested ramp pill), no draft needed.
  const logWarm = (w, r) => {
    unlockAudio();
    const { sets } = buildSetPatch(data, day, dateKey, id, exName, w, r, true);
    setDay({ sets });
  };
  // Restore an exercise removed from this day type, without leaving the session.
  const restoreExercise = (i) => update?.((d) => {
    const c = (d.hidden || {})[id] || [];
    return { ...d, hidden: { ...(d.hidden || {}), [id]: c.filter((x) => x !== i) } };
  });
  const removedSlots = hidden.map((i) => ({ i, name: (base[i] || "").split("—")[0].trim() })).filter((x) => x.name);

  const logSet = (warm = false) => {
    const rv = num(rDraft);
    if (rv === null) return;
    unlockAudio();
    const { sets, pr: hit } = buildSetPatch(data, day, dateKey, id, exName, wNum, rv, warm);
    const patch = { sets };
    if (!warm) {
      const checks = { ...(day.checks || {}) };
      const arr = [...(checks[id] || [])];
      arr[origIdx] = true;
      checks[id] = arr;
      patch.checks = checks;
    }
    setDay(patch);
    setRDraft("");
    if (hit) {
      setPr(hit);
      setPrs((p) => [...p, hit]);
      cues.pr();
      setTimeout(() => setPr(null), 3200);
    }
    if (!warm) startRest(); // warm-ups don't trigger the rest timer
  };

  return (
    <div className="timer-overlay" style={{ background: "var(--bg)", zIndex: 70 }}>
      {pr && (
        <div className="pr-toast" onClick={() => setPr(null)}>
          <div style={{ fontSize: 26 }}>🏆</div>
          <div className="display" style={{ fontSize: 20, fontWeight: 700, color: "var(--good)" }}>PR — {pr.name}</div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>{pr.w} × {pr.r} → e1RM {round1(pr.new)} (was {round1(pr.old)})</div>
        </div>
      )}

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>{STRENGTH[id].name}</div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>{mode === "home" ? "Home" : "Gym"} · {totalSets} sets · {Math.round(volume).toLocaleString()} lbs moved</div>
        </div>
        <button className="btn ghost" onClick={() => setEnded(true)}>End</button>
      </div>

      {!ended ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          {/* exercise pager */}
          <div className="row" style={{ justifyContent: "center", gap: 6 }}>
            {visible.map((v, p) => (
              <button key={v.i} onClick={() => goTo(p)} aria-label={`Exercise ${p + 1}`}
                style={{ width: 10, height: 10, borderRadius: 5, background: p === pos ? "var(--fuel)" : ((day.checks || {})[id] || [])[v.i] ? "var(--good)" : "var(--card2)", border: "1px solid var(--line)" }} />
            ))}
          </div>
          {removedSlots.length > 0 && (
            <div className="row" style={{ justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>Removed:</span>
              {removedSlots.map(({ i, name }) => (
                <button key={i} className="btn ghost" style={{ fontSize: 12, color: "var(--fuel)", padding: "3px 8px" }}
                  onClick={() => restoreExercise(i)}>{name} ↺</button>
              ))}
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.2 }}>{exName}</div>
            <div style={{ fontSize: 14, color: "var(--dim)" }}>{scheme}{custom.includes(ex) ? " · yours" : ""}</div>
            {onBase && (
              <div className="row" style={{ justifyContent: "center", gap: 10, marginTop: 6 }}>
                <button className="btn ghost" style={{ fontSize: 13, color: swapOpen ? "var(--fuel)" : "var(--dim)" }}
                  onClick={() => setSwapOpen((o) => !o)}>⇄ Swap</button>
                <button className="btn ghost" style={{ fontSize: 13, color: "var(--dim)" }}
                  onClick={() => removeExercise(origIdx)}>🗑 Remove</button>
              </div>
            )}
          </div>
          {subs && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>
                {movementLabel(exName) ? `Same muscle (${movementLabel(exName)}):` : "Alternatives:"}
              </div>
              <div className="row" style={{ justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                {subs.map((s) => (
                  <button key={s} className="btn" style={{ fontSize: 13, fontWeight: 600 }}
                    onClick={() => setSwap(origIdx, s)}>{s.split("—")[0].trim()}</button>
                ))}
                {((day.swaps || {})[id] || {})[origIdx] !== undefined && (
                  <button className="btn ghost" style={{ fontSize: 13 }} onClick={() => setSwap(origIdx, null)}>↺ Reset</button>
                )}
              </div>
            </div>
          )}

          {last ? (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "var(--dim)" }}>LAST TIME · {last.k.slice(5)}</span>
                {bestPrev > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fuel)" }}>best {Math.round(bestPrev)} e1RM</span>}
              </div>
              {Array.from({ length: Math.max(prevSets.length, workSets.length) }).map((_, i) => {
                const p = prevSets[i], t = workSets[i];
                const pe = p ? e1rm(p.w, p.r) : 0, te = t ? e1rm(t.w, t.r) : 0;
                const beat = p && t ? (te > pe + 0.01 ? "up" : te < pe - 0.01 ? "down" : "same") : null;
                return (
                  <div key={i} className="row" style={{ gap: 8, fontSize: 14, padding: "3px 0", alignItems: "baseline" }}>
                    <span style={{ width: 20, color: "var(--dim)", fontSize: 12 }}>{i + 1}</span>
                    <span style={{ width: 74, fontWeight: 700, color: p ? "var(--text)" : "var(--dim)" }}>{p ? `${p.w}×${p.r}` : "—"}</span>
                    <span style={{ color: "var(--dim)" }}>→</span>
                    <span style={{ flex: 1, fontWeight: 700, color: t ? "var(--fuel)" : "var(--dim)" }}>{t ? `${t.w}×${t.r}` : "…"}</span>
                    {beat && (
                      <span style={{ fontWeight: 800, color: beat === "up" ? "var(--good)" : beat === "down" ? "var(--bad)" : "var(--dim)" }}>
                        {beat === "up" ? "↑ beat" : beat === "down" ? "↓" : "= tied"}
                      </span>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize: 12, color: lastMaxReps >= 12 ? "var(--good)" : "var(--dim)", marginTop: 4 }}>
                {lastMaxReps >= 12 ? "Hit 12 last time → add load today." : "Beat it: one more rep or +5 lb on any set."}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--dim)" }}>First time logging this one — pick a weight you can do 10 crisp reps with.</div>
          )}

          {ramp && (
            <div style={{ textAlign: "center" }}>
              <div className="field-label" style={{ textAlign: "center" }}>Suggested warm-up · tap to log</div>
              <div className="row" style={{ justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                {ramp.map((s, si) => (
                  <button key={si} className="btn" style={{ fontWeight: 700, borderColor: "color-mix(in srgb, var(--ember) 45%, var(--line))", color: "var(--ember)" }}
                    onClick={() => logWarm(s.w, s.r)}>+ {s.w}×{s.r}</button>
                ))}
                <span style={{ alignSelf: "center", fontSize: 12, color: "var(--dim)" }}>→ then work</span>
              </div>
            </div>
          )}

          {todaySets.length > 0 && (
            <div className="row" style={{ justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              {todaySets.map((s, si) => (
                <div key={si} style={{ borderRadius: 8, padding: "5px 8px 5px 10px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                  background: s.warm ? "color-mix(in srgb, var(--ember) 14%, transparent)" : "var(--card2)",
                  border: s.warm ? "1px solid color-mix(in srgb, var(--ember) 40%, var(--line))" : "1px solid transparent",
                  color: s.warm ? "var(--ember)" : "var(--text)" }}>
                  {s.warm && <span style={{ fontSize: 10, fontWeight: 800 }}>W</span>}
                  {s.w ? `${s.w}×${s.r}` : `${s.r} reps`}
                  <button onClick={() => removeSetAt(si)} aria-label={`Remove set ${si + 1}`} style={{ color: "var(--dim)", fontWeight: 700, fontSize: 15 }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className="row" style={{ gap: 10, justifyContent: "center" }}>
            <div>
              <div className="field-label" style={{ textAlign: "center" }}>lbs</div>
              <input inputMode="decimal" placeholder={wNum ? String(wNum) : "—"} value={wDraft}
                onChange={(e) => setWDraft(sanitizeDecimal(e.target.value))}
                style={{ width: 104, fontSize: 30, padding: "12px 8px", textAlign: "center" }} />
            </div>
            <div>
              <div className="field-label" style={{ textAlign: "center" }}>reps</div>
              <input inputMode="numeric" placeholder="—" value={rDraft}
                onChange={(e) => setRDraft(sanitizeInt(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && logSet(false)}
                style={{ width: 104, fontSize: 30, padding: "12px 8px", textAlign: "center" }} />
            </div>
          </div>
          {plates && (
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--dim)" }}>
              Plates/side: <b style={{ color: "var(--text)" }}>{plates.perSide.join(" + ") || "bar only"}</b>
              {plates.achieved !== wNum && ` (loads to ${plates.achieved})`}
            </div>
          )}

          <button className="btn primary display" style={{ fontSize: 22, padding: "16px 0", borderRadius: 16 }}
            disabled={num(rDraft) === null} onClick={() => logSet(false)}>
            ✓ Log set{num(rDraft) !== null ? ` · ${wNum ? wNum + " × " : ""}${rDraft}` : ""}
          </button>
          <button className="btn" style={{ fontSize: 14, fontWeight: 700, color: num(rDraft) === null ? "var(--dim)" : "var(--ember)", borderColor: "color-mix(in srgb, var(--ember) 35%, var(--line))" }}
            disabled={num(rDraft) === null} onClick={() => logSet(true)}>
            + Warm-up set{num(rDraft) !== null ? ` · ${wNum ? wNum + " × " : ""}${rDraft}` : ""}
          </button>

          {restActive ? (
            <div className="row" style={{ justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--dim)", letterSpacing: "0.08em" }}>REST</span>
              <span className="display" style={{ fontSize: 34, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--fuel)" }}>{fmtClock(restRemaining)}</span>
              <button className="btn" style={{ borderRadius: 999, padding: "6px 12px" }} onClick={addRest}>+30s</button>
              <button className="btn ghost" onClick={stopRest}>skip</button>
            </div>
          ) : (
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--dim)" }}>Rest timer starts on every logged set</div>
          )}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn grow" disabled={pos === 0} onClick={() => goTo(pos - 1)}>← Prev</button>
            <button className="btn grow" disabled={pos >= visible.length - 1} onClick={() => goTo(pos + 1)}>Next →</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 14 }}>
          <div style={{ fontSize: 52 }}>💪</div>
          <div className="display" style={{ fontSize: 28, fontWeight: 700 }}>Session done</div>
          <div style={{ fontSize: 15, color: "var(--dim)" }}>
            {totalSets} sets · {Math.round(volume).toLocaleString()} lbs moved
            {prs.length > 0 && <><br />🏆 {prs.length} PR{prs.length === 1 ? "" : "s"}: {prs.map((p) => p.name).join(", ")}</>}
          </div>
          <button className="btn primary display" style={{ fontSize: 20, padding: "14px 0", borderRadius: 16 }} onClick={close}>Done</button>
          <button className="btn ghost" onClick={() => setEnded(false)}>← Back to session</button>
        </div>
      )}
    </div>
  );
}
