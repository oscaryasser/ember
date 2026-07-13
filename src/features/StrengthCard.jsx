import { useState } from "react";
import { STRENGTH } from "../plan.js";
import { Card, Check, Seg } from "../components/ui.jsx";
import { num, e1rm, round1, sanitizeDecimal, sanitizeInt } from "../lib/util.js";
import { bestBefore, lastSetsFor } from "../lib/strength.js";
import { unlockAudio, cues } from "../lib/audio.js";
import { useRestTimer } from "./RestTimer.jsx";

export default function StrengthCard({ id, data, day, setDay, update, dateKey }) {
  const [drafts, setDrafts] = useState({});
  const [openSets, setOpenSets] = useState({});
  const [pr, setPr] = useState(null);
  const { startRest } = useRestTimer();

  const modeKey = "mode" + id;
  const mode = day[modeKey] || "home";
  const custom = ((data.custom || {})[id] || {})[mode] || [];
  const list = [...STRENGTH[id][mode], ...custom];
  const checks = (day.checks || {})[id] || [];
  const draft = drafts["new"] || "";

  const setDraft = (k, v) => setDrafts((s) => ({ ...s, [k]: v }));

  const toggleCheck = (idx) => {
    const arr = [...checks];
    arr[idx] = !arr[idx];
    setDay({ checks: { ...(day.checks || {}), [id]: arr } });
  };

  const addCustom = () => {
    const t = draft.trim();
    if (!t) return;
    update((d) => {
      const c = { A: { home: [], gym: [] }, B: { home: [], gym: [] }, ...(d.custom || {}) };
      c[id] = { home: [], gym: [], ...c[id] };
      c[id][mode] = [...(c[id][mode] || []), t];
      return { ...d, custom: c };
    });
    setDraft("new", "");
  };

  const removeCustom = (ci) => {
    update((d) => {
      const c = { ...(d.custom || {}) };
      c[id] = { ...c[id], [mode]: c[id][mode].filter((_, i) => i !== ci) };
      return { ...d, custom: c };
    });
  };

  return (
    <Card style={{ marginTop: 12 }}>
      {pr && (
        <div className="pr-toast" onClick={() => setPr(null)}>
          <div style={{ fontSize: 26 }}>🏆</div>
          <div className="display" style={{ fontSize: 20, fontWeight: 700, color: "var(--good)" }}>PR — {pr.name}</div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>
            {pr.w} × {pr.r} → est. 1RM {round1(pr.new)} lbs{pr.old > 0 ? ` (was ${round1(pr.old)})` : ""}
          </div>
        </div>
      )}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <div className="display" style={{ fontSize: 19, fontWeight: 700 }}>{STRENGTH[id].name}</div>
        <Seg options={[["home", "Home"], ["gym", "Gym"]]} value={mode} onChange={(m) => setDay({ [modeKey]: m })} />
      </div>

      {list.map((ex, i) => {
        const isCustom = i >= STRENGTH[id][mode].length;
        const exName = ex.split("—")[0].trim();
        const rowKey = `${id}-${i}`;
        const todaySets = ((day.sets || {})[id] || {})[exName] || [];
        const open = openSets[rowKey] !== undefined ? openSets[rowKey] : todaySets.length > 0;
        const last = lastSetsFor(data, id, exName, dateKey);
        const lastMaxReps = last ? Math.max(...last.sets.map((s) => s.r)) : 0;
        const wDraft = drafts["w-" + rowKey] || "";
        const rDraft = drafts["r-" + rowKey] || "";

        const addSet = () => {
          const wv = num(wDraft), rv = num(rDraft);
          if (rv === null) return;
          unlockAudio(); // user gesture — arms the rest-done beep
          const newE1 = e1rm(wv ?? 0, rv);
          const prevBest = Math.max(
            bestBefore(data, exName, dateKey),
            ...todaySets.map((s) => e1rm(s.w, s.r)),
            0
          );
          const sets = { ...(day.sets || {}) };
          sets[id] = { ...(sets[id] || {}) };
          sets[id][exName] = [...(sets[id][exName] || []), { w: wv ?? 0, r: rv }];
          setDay({ sets });
          setDraft("r-" + rowKey, "");
          // Only celebrate against real history — a first-ever session isn't a PR.
          if (last && prevBest > 0 && newE1 > prevBest) {
            setPr({ name: exName, w: wv ?? 0, r: rv, new: newE1, old: prevBest });
            cues.pr();
            setTimeout(() => setPr(null), 3500);
          }
          startRest();
        };

        const removeSet = (si) => {
          const sets = { ...(day.sets || {}) };
          sets[id] = { ...(sets[id] || {}) };
          sets[id][exName] = sets[id][exName].filter((_, x) => x !== si);
          setDay({ sets });
        };

        return (
          <div key={rowKey} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
            <div className="row" style={{ padding: "10px 4px" }}>
              <button className="row grow" style={{ textAlign: "left", gap: 10 }} onClick={() => toggleCheck(i)}>
                <Check on={!!checks[i]} />
                <span style={{ fontSize: 15, color: checks[i] ? "var(--dim)" : "var(--text)", textDecoration: checks[i] ? "line-through" : "none" }}>
                  {ex}
                  {isCustom && <span style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, marginLeft: 6 }}>MINE</span>}
                </span>
              </button>
              {isCustom && (
                <button style={{ color: "var(--dim)", fontSize: 15, padding: "0 4px" }} title="Remove exercise"
                  aria-label={`Remove ${exName}`}
                  onClick={() => removeCustom(i - STRENGTH[id][mode].length)}>×</button>
              )}
              <button
                onClick={() => setOpenSets((s) => ({ ...s, [rowKey]: !open }))}
                style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: open || todaySets.length ? "var(--fuel)" : "var(--dim)", padding: "4px 6px", background: "var(--card2)", borderRadius: 8 }}>
                {todaySets.length ? `${todaySets.length} sets` : "sets"} {open ? "▴" : "▾"}
              </button>
            </div>

            {open && (
              <div style={{ padding: "0 4px 12px 34px" }}>
                {last && (
                  <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 6 }}>
                    Last ({last.k.slice(5)}): {last.sets.map((s) => `${s.w ? s.w + "×" : ""}${s.r}`).join(", ")}
                    {lastMaxReps >= 12 && <span style={{ color: "var(--good)", fontWeight: 700 }}> → hit 12, go up</span>}
                  </div>
                )}
                {todaySets.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {todaySets.map((s, si) => (
                      <div key={si} style={{ background: "var(--card2)", borderRadius: 8, padding: "4px 8px", fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                        {s.w ? `${s.w} × ${s.r}` : `${s.r} reps`}
                        <button onClick={() => removeSet(si)} aria-label={`Remove set ${si + 1}`} style={{ color: "var(--dim)", fontWeight: 700 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="row" style={{ gap: 6 }}>
                  <input inputMode="decimal" placeholder="lbs" value={wDraft}
                    onChange={(e) => setDraft("w-" + rowKey, sanitizeDecimal(e.target.value))}
                    style={{ width: 68, fontSize: 15, padding: 8, textAlign: "center" }} />
                  <input inputMode="numeric" placeholder="reps" value={rDraft}
                    onChange={(e) => setDraft("r-" + rowKey, sanitizeInt(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && addSet()}
                    style={{ width: 68, fontSize: 15, padding: 8, textAlign: "center" }} />
                  <button onClick={addSet} className="btn"
                    style={num(rDraft) !== null ? { background: "var(--fuel)", color: "var(--on-accent)", borderColor: "var(--fuel)", fontWeight: 800, fontSize: 13 } : { fontWeight: 800, fontSize: 13, color: "var(--dim)" }}>
                    + Set
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <input className="body-font" value={draft} onChange={(e) => setDraft("new", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder={`Add your own (${mode}) — e.g. Face pulls — 3 × 15`}
          style={{ fontSize: 15, padding: "10px 12px" }} />
        <button onClick={addCustom} className="btn"
          style={draft.trim() ? { background: "var(--ember)", color: "var(--on-accent)", borderColor: "var(--ember)", fontWeight: 800 } : { fontWeight: 800, color: "var(--dim)" }}>
          Add
        </button>
      </div>
      <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 8 }}>
        Hit 12 clean reps on everything → add load or reps next time. A {Math.round((data.goals.restSecs || 90))}s rest timer starts on every logged set.
      </div>
    </Card>
  );
}
