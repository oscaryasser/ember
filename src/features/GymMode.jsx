import { useMemo, useState } from "react";
import { STRENGTH } from "../plan.js";
import { num, round1, sanitizeDecimal, sanitizeInt } from "../lib/util.js";
import { lastSetsFor, buildSetPatch } from "../lib/strength.js";
import { plateBreakdown, warmupRamp } from "../lib/plates.js";
import { fmtClock } from "../lib/dates.js";
import { unlockAudio, cues } from "../lib/audio.js";
import { keepAwake, releaseAwake } from "../lib/wakeLock.js";
import { useRestTimer } from "./RestTimer.jsx";

// Gym Mode: one exercise at a time, huge targets, the rest timer and plate
// math on-screen — the run timer's philosophy applied to lifting.
export default function GymMode({ id, data, day, setDay, dateKey, onClose }) {
  const modeKey = "mode" + id;
  const mode = day[modeKey] || "home";
  const custom = ((data.custom || {})[id] || {})[mode] || [];
  const list = [...STRENGTH[id][mode], ...custom];
  const { startRest, restRemaining, restActive, addRest, stopRest } = useRestTimer();

  const [idx, setIdx] = useState(0);
  const [wDraft, setWDraft] = useState("");
  const [rDraft, setRDraft] = useState("");
  const [pr, setPr] = useState(null);
  const [prs, setPrs] = useState([]);
  const [ended, setEnded] = useState(false);

  useMemo(() => { keepAwake(); }, []);
  const close = () => { releaseAwake(); onClose(); };

  const ex = list[Math.min(idx, list.length - 1)];
  const exName = ex.split("—")[0].trim();
  const scheme = ex.split("—")[1]?.trim() || "";
  const todaySets = ((day.sets || {})[id] || {})[exName] || [];
  const last = lastSetsFor(data, id, exName, dateKey);
  const lastMaxReps = last ? Math.max(...last.sets.map((s) => s.r)) : 0;
  const lastTopW = last ? Math.max(...last.sets.map((s) => s.w || 0)) : 0;

  const wNum = num(wDraft) ?? (todaySets.length ? todaySets[todaySets.length - 1].w : lastTopW || null);
  const plates = plateBreakdown(wNum);
  const ramp = todaySets.length === 0 && lastTopW > 55 ? warmupRamp(lastTopW) : null;

  const totalSets = Object.values((day.sets || {})[id] || {}).reduce((a, s) => a + s.length, 0);
  const volume = Object.values((day.sets || {})[id] || {}).reduce((a, s) => a + s.reduce((x, y) => x + (y.w || 0) * y.r, 0), 0);

  const logSet = () => {
    const rv = num(rDraft);
    if (rv === null) return;
    unlockAudio();
    const { sets, pr: hit } = buildSetPatch(data, day, dateKey, id, exName, wNum, rv);
    const checks = { ...(day.checks || {}) };
    const arr = [...(checks[id] || [])];
    arr[idx] = true;
    checks[id] = arr;
    setDay({ sets, checks });
    setRDraft("");
    if (hit) {
      setPr(hit);
      setPrs((p) => [...p, hit]);
      cues.pr();
      setTimeout(() => setPr(null), 3200);
    }
    startRest();
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
            {list.map((_, i) => (
              <button key={i} onClick={() => { setIdx(i); setWDraft(""); setRDraft(""); }} aria-label={`Exercise ${i + 1}`}
                style={{ width: 10, height: 10, borderRadius: 5, background: i === idx ? "var(--fuel)" : ((day.checks || {})[id] || [])[i] ? "var(--good)" : "var(--card2)", border: "1px solid var(--line)" }} />
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.2 }}>{exName}</div>
            <div style={{ fontSize: 14, color: "var(--dim)" }}>{scheme}{custom.includes(ex) ? " · yours" : ""}</div>
          </div>

          {last ? (
            <div style={{ textAlign: "center", fontSize: 14, color: "var(--dim)" }}>
              Last ({last.k.slice(5)}): <b style={{ color: "var(--text)" }}>{last.sets.map((s) => `${s.w ? s.w + "×" : ""}${s.r}`).join(", ")}</b>
              {lastMaxReps >= 12 && <span style={{ color: "var(--good)", fontWeight: 700 }}> → hit 12, go up</span>}
            </div>
          ) : (
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--dim)" }}>First time logging this one — pick a weight you can do 10 crisp reps with.</div>
          )}

          {ramp && (
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--fuel)", fontWeight: 600 }}>
              Warm-up: {ramp.map((s) => `${s.label} ${s.w}×${s.r}`).join(" → ")} → work
            </div>
          )}

          {todaySets.length > 0 && (
            <div className="row" style={{ justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              {todaySets.map((s, si) => (
                <div key={si} style={{ background: "var(--card2)", borderRadius: 8, padding: "5px 10px", fontSize: 14, fontWeight: 700 }}>
                  {s.w ? `${s.w}×${s.r}` : `${s.r} reps`}
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
                onKeyDown={(e) => e.key === "Enter" && logSet()}
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
            disabled={num(rDraft) === null} onClick={logSet}>
            ✓ Log set{num(rDraft) !== null ? ` · ${wNum ? wNum + " × " : ""}${rDraft}` : ""}
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
            <button className="btn grow" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setWDraft(""); setRDraft(""); }}>← Prev</button>
            <button className="btn grow" disabled={idx >= list.length - 1} onClick={() => { setIdx(idx + 1); setWDraft(""); setRDraft(""); }}>Next →</button>
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
