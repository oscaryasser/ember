import { useState, useEffect, useRef, useMemo } from "react";

// ---------- Plan data ----------
const RUN_WEEKS = {
  1: { label: "Week 1", protocol: "8 × (1 min jog / 2 min walk)", detail: "5 min brisk walk warmup. Jog easy — you should be able to talk. ~29 min total.", jog: 8, cool: "5 min walk cooldown" },
  2: { label: "Week 2", protocol: "8 × (1 min jog / 2 min walk)", detail: "Same as week 1. Jogs should feel slightly easier by the end of the week.", jog: 8, cool: "5 min walk cooldown" },
  3: { label: "Week 3", protocol: "6 × (2 min jog / 2 min walk)", detail: "5 min warmup walk. Total jog time: 12 min.", jog: 12, cool: "5 min walk cooldown" },
  4: { label: "Week 4", protocol: "6 × (2 min jog / 2 min walk)", detail: "Repeat. If shins or knees complain, stay here another week.", jog: 12, cool: "5 min walk cooldown" },
  5: { label: "Week 5", protocol: "5 × (3 min jog / 90 sec walk)", detail: "5 min warmup. Total jog time: 15 min.", jog: 15, cool: "5 min walk cooldown" },
  6: { label: "Week 6", protocol: "5 × (3 min jog / 90 sec walk)", detail: "Repeat week 5. Keep the pace conversational.", jog: 15, cool: "5 min walk cooldown" },
  7: { label: "Week 7", protocol: "3 × (5 min jog / 2 min walk)", detail: "5 min warmup. Total jog time: 15 min in longer blocks.", jog: 15, cool: "5 min walk cooldown" },
  8: { label: "Week 8", protocol: "8 min jog / 5 min walk / 8 min jog", detail: "First long continuous blocks. Slow is fine — continuous is the goal.", jog: 16, cool: "5 min walk cooldown" },
  9: { label: "Week 9", protocol: "20–25 min continuous jog", detail: "First run: 20 min straight. Second run of the week: 25 min.", jog: 22, cool: "5 min walk cooldown" },
  10: { label: "Week 10", protocol: "30 min continuous jog", detail: "The goal run. Zero to 30 minutes non-stop. Repeat this week as your new baseline.", jog: 30, cool: "5 min walk cooldown" },
};

const STRENGTH = {
  A: {
    name: "Strength A · Push focus",
    home: [
      "Weight-vest squats — 3 × 8–12",
      "Weight-vest push-ups — 3 × 8–12",
      "Band-assisted pull-ups (or band rows) — 3 × 8–12",
      "Plank — 3 × 30–45 sec",
    ],
    gym: [
      "Leg press or goblet squat — 3 × 8–12",
      "Chest press machine / DB bench — 3 × 8–12",
      "Lat pulldown — 3 × 8–12",
      "Cable crunch — 3 × 12–15",
    ],
  },
  B: {
    name: "Strength B · Hinge & pull focus",
    home: [
      "Banded RDL or vest good-mornings — 3 × 8–12",
      "Pike push-ups or band overhead press — 3 × 8–12",
      "Band rows — 3 × 10–15",
      "Weight-vest lunges — 3 × 8–10 / leg",
    ],
    gym: [
      "Dumbbell Romanian deadlift — 3 × 8–12",
      "Shoulder press machine / DB press — 3 × 8–12",
      "Seated cable row — 3 × 8–12",
      "Walking lunges — 3 × 8–10 / leg",
    ],
  },
};

const WEEKLY_TARGET = { runs: 2, strength: 2 };
const DAILY_DEFICIT_GOAL = 500;

// ---------- Helpers ----------
const todayKey = () => new Date().toLocaleDateString("en-CA");
const keyOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
};
const shortDay = (key) => {
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
};
const niceDate = (key) => {
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};
// Monday-start week keys for the week containing `key`
const weekKeys = (key) => {
  const d = new Date(key + "T12:00:00");
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  const start = new Date(d);
  start.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x.toLocaleDateString("en-CA");
  });
};
const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};
const netOf = (day) => {
  if (!day) return null;
  const cin = num(day.calIn);
  const act = num(day.calActive);
  const rest = num(day.calResting);
  if (cin === null || (act === null && rest === null)) return null;
  return cin - ((act || 0) + (rest || 0)); // negative = deficit
};
const proteinOf = (d) => {
  if (!d) return 0;
  const legacy = num(d.protein) || 0;
  return legacy + (d.proteinEntries || []).reduce((a, b) => a + b, 0);
};
const PROTEIN_GOAL = 160;

const EMPTY_DAY = { activities: [], runWeek: null, checks: {}, calIn: "", calActive: "", calResting: "", mins: "", protein: "", weight: "", steps: "", sleepScore: "", sleepHours: "" };

const THEMES = {
  dark: {
    bg: "#10141C", card: "#1A2029", card2: "#212936", line: "#2C3644",
    text: "#E8ECF2", dim: "#8C97A8", burn: "#F6A028", fuel: "#4FC3D9",
    good: "#5FD68B", bad: "#F26D6D", onAccent: "#10141C",
    navBg: "rgba(16,20,28,0.95)", placeholder: "#4A5568",
  },
  light: {
    bg: "#F4F6F9", card: "#FFFFFF", card2: "#EDF1F6", line: "#D8DFE8",
    text: "#1B2430", dim: "#525C69", burn: "#D9820F", fuel: "#0E8CA5",
    good: "#1FA35C", bad: "#D64545", onAccent: "#FFFFFF",
    navBg: "rgba(244,246,249,0.95)", placeholder: "#A9B2BE",
  },
};

// ---------- Component ----------
export default function RecompTracker() {
  const [data, setData] = useState({ days: {}, runWeek: 1 });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const [dateKey, setDateKey] = useState(todayKey());
  const [saveState, setSaveState] = useState("idle");
  const [drafts, setDrafts] = useState({});
  const [openSets, setOpenSets] = useState({});
  const [collapsed, setCollapsed] = useState({ garmin: true, protein: true });
  const saveTimer = useRef(null);

  const completedRunsAtWeek = (w) =>
    Object.values(data.days).filter((dd) => (dd.activities || []).includes("run") && dd.checks?.run && (dd.runWeek || 0) === w).length;

  const lastSetsFor = (id, name) => {
    const keys = Object.keys(data.days).filter((k) => k < dateKey).sort().reverse();
    for (const k of keys) {
      const s = data.days[k]?.sets?.[id]?.[name];
      if (s && s.length) return { k, sets: s };
    }
    return null;
  };

  // Load
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("recomp:data");
        if (r && r.value) {
          const parsed = JSON.parse(r.value);
          if (parsed && parsed.days) setData({ runWeek: 1, ...parsed });
        }
      } catch (e) {
        /* no saved data yet */
      }
      setLoaded(true);
    })();
  }, []);

  // Debounced save
  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set("recomp:data", JSON.stringify(data));
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch (e) {
        setSaveState("error");
      }
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded]);

  const day = data.days[dateKey] || EMPTY_DAY;
  const setDay = (patch) =>
    setData((d) => ({
      ...d,
      days: { ...d.days, [dateKey]: { ...EMPTY_DAY, ...(d.days[dateKey] || {}), ...patch } },
    }));

  const toggleActivity = (act) => {
    const has = day.activities.includes(act);
    const activities = has ? day.activities.filter((a) => a !== act) : [...day.activities, act];
    const patch = { activities };
    if (act === "run" && !has && !day.runWeek) patch.runWeek = data.runWeek;
    setDay(patch);
  };

  const toggleCheck = (workout, idx) => {
    const checks = { ...(day.checks || {}) };
    const arr = [...(checks[workout] || [])];
    arr[idx] = !arr[idx];
    checks[workout] = arr;
    setDay({ checks });
  };

  const net = netOf(day);

  // Week + dashboard stats
  const wk = weekKeys(dateKey);
  const weekStats = useMemo(() => {
    let runs = 0, strength = 0, deficit = 0, logged = 0;
    wk.forEach((k) => {
      const dd = data.days[k];
      if (!dd) return;
      if (dd.activities?.includes("run")) runs++;
      if (dd.activities?.includes("A")) strength++;
      if (dd.activities?.includes("B")) strength++;
      const n = netOf(dd);
      if (n !== null) { deficit += -n; logged++; }
    });
    return { runs, strength, deficit, logged };
  }, [data, dateKey]);

  const last7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => keyOffset(i - 6)).map((k) => ({ k, net: netOf(data.days[k]), day: data.days[k] })),
    [data]
  );

  const weights = useMemo(() => {
    return Object.entries(data.days)
      .filter(([, d]) => num(d.weight) !== null)
      .map(([k, d]) => ({ k, w: num(d.weight) }))
      .sort((a, b) => (a.k < b.k ? -1 : 1));
  }, [data]);

  const totalSessions = useMemo(() => {
    let t = 0;
    Object.values(data.days).forEach((d) => (t += (d.activities || []).length));
    return t;
  }, [data]);

  // ---------- styles ----------
  const theme = data.theme || "dark";
  const C = THEMES[theme];
  const font = { display: "'Barlow Condensed', 'Arial Narrow', sans-serif", body: "'Inter', -apple-system, system-ui, sans-serif" };

  const chip = (active, color) => ({
    padding: "10px 14px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
    border: `1.5px solid ${active ? color : C.line}`,
    background: active ? color + "22" : C.card2, color: active ? color : C.dim,
    transition: "all .15s", userSelect: "none", flex: "1 1 auto", textAlign: "center", minWidth: 70,
  });

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: C.card2, border: `1px solid ${C.line}`,
    borderRadius: 10, padding: "12px 12px", color: C.text, fontSize: 17, fontFamily: font.display,
    fontWeight: 600, letterSpacing: "0.02em", outline: "none",
  };

  const Field = ({ label, unit, value, onChange, color }) => (
    <div style={{ flex: "1 1 44%", minWidth: 130 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: color || C.dim, marginBottom: 5, fontWeight: 600 }}>
        {label} <span style={{ color: C.dim, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{unit}</span>
      </div>
      <input inputMode="decimal" placeholder="—" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} style={inputStyle} />
    </div>
  );

  const Card = useMemo(() => {
    const T = THEMES[theme];
    return ({ children, style }) => (
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 16, ...style }}>{children}</div>
    );
  }, [theme]);

  const SectionLabel = useMemo(() => {
    const T = THEMES[theme];
    return ({ children, color }) => (
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: color || T.dim, fontWeight: 700, marginBottom: 10 }}>{children}</div>
    );
  }, [theme]);

  // ---------- Strength card with home/gym toggle ----------
  const StrengthCard = ({ id }) => {
    const modeKey = "mode" + id;
    const mode = day[modeKey] || "home";
    const custom = ((data.custom || {})[id] || {})[mode] || [];
    const list = [...STRENGTH[id][mode], ...custom];
    const checks = (day.checks || {})[id] || [];
    const draftKey = id + mode;
    const draft = drafts[draftKey] || "";
    const setDraft = (v) => setDrafts((s) => ({ ...s, [draftKey]: v }));
    const addCustom = () => {
      const t = draft.trim();
      if (!t) return;
      setData((d) => {
        const c = { A: { home: [], gym: [] }, B: { home: [], gym: [] }, ...(d.custom || {}) };
        c[id] = { home: [], gym: [], ...c[id] };
        c[id][mode] = [...(c[id][mode] || []), t];
        return { ...d, custom: c };
      });
      setDraft("");
    };
    const removeCustom = (ci) => {
      setData((d) => {
        const c = { ...(d.custom || {}) };
        c[id] = { ...c[id], [mode]: c[id][mode].filter((_, i) => i !== ci) };
        return { ...d, custom: c };
      });
    };
    return (
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
          <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 700, color: C.text }}>{STRENGTH[id].name}</div>
          <div style={{ display: "flex", background: C.card2, borderRadius: 10, padding: 3 }}>
            {["home", "gym"].map((m) => (
              <div key={m} onClick={() => setDay({ [modeKey]: m })}
                style={{ padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", color: mode === m ? C.onAccent : C.dim, background: mode === m ? C.burn : "transparent" }}>
                {m === "home" ? "Home" : "Gym"}
              </div>
            ))}
          </div>
        </div>
        {list.map((ex, i) => {
          const isCustom = i >= STRENGTH[id][mode].length;
          const exName = ex.split("—")[0].trim();
          const rowKey = `${id}-${i}`;
          const todaySets = ((day.sets || {})[id] || {})[exName] || [];
          const open = openSets[rowKey] !== undefined ? openSets[rowKey] : todaySets.length > 0;
          const last = lastSetsFor(id, exName);
          const lastMaxReps = last ? Math.max(...last.sets.map((s) => s.r)) : 0;
          const wDraft = drafts["w-" + rowKey] || "";
          const rDraft = drafts["r-" + rowKey] || "";
          const addSet = () => {
            const wv = num(wDraft), rv = num(rDraft);
            if (rv === null) return;
            const sets = { ...(day.sets || {}) };
            sets[id] = { ...(sets[id] || {}) };
            sets[id][exName] = [...(sets[id][exName] || []), { w: wv ?? 0, r: rv }];
            setDay({ sets });
            setDrafts((s) => ({ ...s, ["r-" + rowKey]: "" }));
          };
          const removeSet = (si) => {
            const sets = { ...(day.sets || {}) };
            sets[id] = { ...(sets[id] || {}) };
            sets[id][exName] = sets[id][exName].filter((_, x) => x !== si);
            setDay({ sets });
          };
          return (
            <div key={i} style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px" }}>
                <div onClick={() => toggleCheck(id, i)} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${checks[i] ? C.good : C.line}`, background: checks[i] ? C.good : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: C.onAccent, fontSize: 13, fontWeight: 800 }}>
                    {checks[i] ? "✓" : ""}
                  </div>
                  <div style={{ fontSize: 15, color: checks[i] ? C.dim : C.text, textDecoration: checks[i] ? "line-through" : "none" }}>
                    {ex}{isCustom && <span style={{ fontSize: 11, color: C.dim, fontWeight: 700, marginLeft: 6 }}>MINE</span>}
                  </div>
                </div>
                {isCustom && (
                  <div onClick={() => removeCustom(i - STRENGTH[id][mode].length)}
                    style={{ color: C.dim, fontSize: 15, cursor: "pointer", padding: "0 4px", flexShrink: 0 }} title="Remove exercise">×</div>
                )}
                <div onClick={() => setOpenSets((s) => ({ ...s, [rowKey]: !open }))}
                  style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: open || todaySets.length ? C.fuel : C.dim, cursor: "pointer", padding: "4px 6px", background: C.card2, borderRadius: 8 }}>
                  {todaySets.length ? `${todaySets.length} sets` : "sets"} {open ? "▴" : "▾"}
                </div>
              </div>
              {open && (
                <div style={{ padding: "0 4px 12px 34px" }}>
                  {last && (
                    <div style={{ fontSize: 13, color: C.dim, marginBottom: 6 }}>
                      Last ({last.k.slice(5)}): {last.sets.map((s) => `${s.w ? s.w + "×" : ""}${s.r}`).join(", ")}
                      {lastMaxReps >= 12 && <span style={{ color: C.good, fontWeight: 700 }}> → hit 12, go up</span>}
                    </div>
                  )}
                  {todaySets.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                      {todaySets.map((s, si) => (
                        <div key={si} style={{ background: C.card2, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: C.text, display: "flex", gap: 6, alignItems: "center" }}>
                          {s.w ? `${s.w} × ${s.r}` : `${s.r} reps`}
                          <span onClick={() => removeSet(si)} style={{ color: C.dim, cursor: "pointer", fontWeight: 700 }}>×</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input inputMode="decimal" placeholder="lbs" value={wDraft}
                      onChange={(e) => setDrafts((s) => ({ ...s, ["w-" + rowKey]: e.target.value.replace(/[^0-9.]/g, "") }))}
                      style={{ ...inputStyle, width: 64, fontSize: 15, padding: "8px 8px", textAlign: "center" }} />
                    <input inputMode="numeric" placeholder="reps" value={rDraft}
                      onChange={(e) => setDrafts((s) => ({ ...s, ["r-" + rowKey]: e.target.value.replace(/[^0-9]/g, "") }))}
                      onKeyDown={(e) => e.key === "Enter" && addSet()}
                      style={{ ...inputStyle, width: 64, fontSize: 15, padding: "8px 8px", textAlign: "center" }} />
                    <div onClick={addSet}
                      style={{ background: num(rDraft) ? C.fuel : C.card2, color: num(rDraft) ? C.onAccent : C.dim, borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center" }}>
                      + Set
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder={`Add your own (${mode}) — e.g. Face pulls — 3 × 15`}
            style={{ ...inputStyle, fontSize: 15, fontFamily: font.body, fontWeight: 400, flex: 1, padding: "10px 12px" }} />
          <div onClick={addCustom}
            style={{ background: draft.trim() ? C.burn : C.card2, color: draft.trim() ? C.onAccent : C.dim, borderRadius: 10, padding: "10px 16px", fontWeight: 800, fontSize: 15, cursor: "pointer", alignSelf: "stretch", display: "flex", alignItems: "center" }}>
            Add
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.dim, marginTop: 8 }}>Hit 12 clean reps on everything → add load or reps next time. Your added exercises stay in this workout permanently.</div>
      </Card>
    );
  };

  const RunCard = () => {
    const w = day.runWeek || data.runWeek;
    const rw = RUN_WEEKS[w];
    const done = (day.checks || {}).run;
    const d = new Date(dateKey + "T12:00:00");
    const adjacentRun = [-1, 1].some((off) => {
      const x = new Date(d); x.setDate(d.getDate() + off);
      const dd = data.days[x.toLocaleDateString("en-CA")];
      return dd && (dd.activities || []).includes("run");
    });
    return (
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 700 }}>Run · {rw.label}</div>
          <select value={w} onChange={(e) => { const v = parseInt(e.target.value); setDay({ runWeek: v }); setData((d) => ({ ...d, runWeek: v })); }}
            style={{ background: C.card2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 8px", fontSize: 13 }}>
            {Object.keys(RUN_WEEKS).map((k) => <option key={k} value={k}>Week {k}</option>)}
          </select>
        </div>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: C.burn, lineHeight: 1.15 }}>{rw.protocol}</div>
        <div style={{ fontSize: 13, color: C.dim, margin: "8px 0 4px" }}>{rw.detail}</div>
        <div style={{ fontSize: 13, color: C.dim }}>{rw.cool}. If the week felt hard, repeat it — the plan bends, your shins don't.</div>
        {adjacentRun && (
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: C.burn + "1A", border: `1px solid ${C.burn}55`, fontSize: 13, color: C.burn, fontWeight: 600 }}>
            ⚠ Back-to-back run days. Fine once in a while, but tendons want ~48h between runs — especially at your starting weight.
          </div>
        )}
        <div onClick={() => setDay({ checks: { ...(day.checks || {}), run: !done } })}
          style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, textAlign: "center", fontWeight: 700, fontSize: 15, cursor: "pointer",
            background: done ? C.good : C.card2, color: done ? C.onAccent : C.text, border: `1px solid ${done ? C.good : C.line}` }}>
          {done ? "✓ Run completed" : "Mark run completed"}
        </div>
        {(() => {
          if (w !== data.runWeek || w >= 10) return null;
          const completed = completedRunsAtWeek(w);
          const ack = (data.runAck || {})[w] || 0;
          if (completed - ack < 2) return null;
          return (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: C.good + "14", border: `1px solid ${C.good}55` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.good, marginBottom: 8 }}>
                ✓ {completed} runs done at Week {w} — ready to move up?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div onClick={() => setData((d) => ({ ...d, runWeek: Math.min(10, w + 1) }))}
                  style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 10, background: C.good, color: C.onAccent, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  Advance to Week {w + 1}
                </div>
                <div onClick={() => setData((d) => ({ ...d, runAck: { ...(d.runAck || {}), [w]: completed } }))}
                  style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 10, background: C.card2, color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", border: `1px solid ${C.line}` }}>
                  Repeat Week {w}
                </div>
              </div>
            </div>
          );
        })()}
      </Card>
    );
  };

  // ---------- Energy ledger (signature element) ----------
  const EnergyLedger = () => {
    const cin = num(day.calIn) || 0;
    const out = (num(day.calActive) || 0) + (num(day.calResting) || 0);
    const max = Math.max(cin, out, 1);
    const bar = (v, color) => (
      <div style={{ flex: 1, background: C.card2, borderRadius: 8, height: 14, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (v / max) * 100)}%`, height: "100%", background: color, borderRadius: 8, transition: "width .3s" }} />
      </div>
    );
    let verdict = null;
    if (net !== null) {
      const deficit = -net;
      if (deficit >= DAILY_DEFICIT_GOAL) verdict = { txt: `Deficit hit · −${Math.round(deficit)} kcal`, color: C.good };
      else if (deficit > 0) verdict = { txt: `Small deficit · −${Math.round(deficit)} kcal`, color: C.burn };
      else verdict = { txt: `Surplus · +${Math.round(-deficit)} kcal`, color: C.bad };
    }
    return (
      <Card style={{ marginTop: 12, borderColor: verdict ? verdict.color + "55" : C.line }}>
        <SectionLabel>Net energy balance</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.fuel, width: 34 }}>IN</span>
          {bar(cin, C.fuel)}
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.fuel, width: 52, textAlign: "right" }}>{cin || "—"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.burn, width: 34 }}>OUT</span>
          {bar(out, C.burn)}
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.burn, width: 52, textAlign: "right" }}>{out || "—"}</span>
        </div>
        <div style={{ marginTop: 14, textAlign: "center" }}>
          {verdict ? (
            <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: verdict.color }}>{verdict.txt}</div>
          ) : (
            <div style={{ fontSize: 13, color: C.dim }}>Log calories in + Garmin burn to see today's balance. Goal: −{DAILY_DEFICIT_GOAL} kcal/day.</div>
          )}
          {proteinOf(day) > 0 && (
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: proteinOf(day) >= 160 ? C.good : proteinOf(day) >= 120 ? C.burn : C.bad }}>
              Protein {Math.round(proteinOf(day))}g {proteinOf(day) >= 160 ? "· target hit — this is what keeps the muscle" : proteinOf(day) >= 120 ? "· close, get one more protein feeding in" : "· low — recomp doesn't work without it"}
            </div>
          )}
        </div>
      </Card>
    );
  };

  // ---------- Tabs ----------
  const TodayTab = () => (
    <div>
      {/* progress hero — results before inputs */}
      <Card style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
        <div onClick={() => setTab("dash")} style={{ flex: "1 1 40%", minWidth: 110, cursor: "pointer" }}>
          {weights.length >= 2 ? (() => {
            const pts = weights.slice(-14);
            const target = num(data.targetWeight);
            const ys = pts.map((p) => p.w).concat(target !== null ? [target] : []);
            const yMin = Math.min(...ys) - 1, yMax = Math.max(...ys) + 1;
            const W = 130, H = 48;
            const X = (i) => 2 + (i / (pts.length - 1)) * (W - 4);
            const Y = (v) => 4 + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - 8);
            const path = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join(" ");
            return (
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
                {target !== null && <line x1="2" x2={W - 2} y1={Y(target)} y2={Y(target)} stroke={C.good} strokeWidth="1.2" strokeDasharray="4 3" />}
                <path d={path} fill="none" stroke={C.burn} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1].w)} r="3.2" fill={C.burn} />
              </svg>
            );
          })() : (
            <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.4 }}>Log 2+ weigh-ins and your trend line appears here</div>
          )}
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginTop: 2 }}>
            {weights.length ? `${weights[weights.length - 1].w} lbs · tap for graph` : "weight trend"}
          </div>
        </div>
        <div style={{ flex: "1 1 25%", textAlign: "center" }}>
          <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: weekStats.deficit > 0 ? C.good : weekStats.logged ? C.bad : C.dim }}>
            {weekStats.logged ? `${weekStats.deficit > 0 ? "−" : "+"}${Math.abs(Math.round(weekStats.deficit)).toLocaleString()}` : "—"}
          </div>
          <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>week kcal</div>
        </div>
        <div style={{ flex: "1 1 20%", textAlign: "center" }}>
          <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: weekStats.runs + weekStats.strength >= 4 ? C.good : C.text }}>
            {weekStats.runs + weekStats.strength}<span style={{ fontSize: 15, color: C.dim }}>/4</span>
          </div>
          <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>sessions</div>
        </div>
      </Card>

      {/* date strip */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 4 }}>
        {Array.from({ length: 8 }, (_, i) => keyOffset(i - 6)).map((k) => {
          const active = k === dateKey;
          const hasLog = data.days[k] && ((data.days[k].activities || []).length || netOf(data.days[k]) !== null);
          return (
            <div key={k} onClick={() => setDateKey(k)}
              style={{ minWidth: 46, textAlign: "center", padding: "8px 4px", borderRadius: 12, cursor: "pointer",
                background: active ? C.burn : C.card, border: `1px solid ${active ? C.burn : C.line}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: active ? C.onAccent : C.dim, textTransform: "uppercase" }}>{shortDay(k)}</div>
              <div style={{ fontFamily: font.display, fontSize: 17, fontWeight: 700, color: active ? C.onAccent : C.text }}>{k.slice(8)}</div>
              <div style={{ height: 5 }}>{hasLog && !active && <div style={{ width: 5, height: 5, borderRadius: 3, background: C.good, margin: "0 auto" }} />}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: C.dim, marginBottom: 12 }}>{niceDate(dateKey)}{dateKey === todayKey() ? " · today" : ""}</div>

      <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 26 }}>⚖️</div>
        <div style={{ flex: "1 1 90px", minWidth: 90 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.dim, marginBottom: 4, fontWeight: 700 }}>Today's weight</div>
          <input inputMode="decimal" placeholder="lbs" value={day.weight} onChange={(e) => setDay({ weight: e.target.value.replace(/[^0-9.]/g, "") })}
            style={{ ...inputStyle, fontSize: 22, padding: "8px 10px" }} />
        </div>
        <div style={{ flex: "1 1 90px", minWidth: 90 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.good, marginBottom: 4, fontWeight: 700 }}>Target</div>
          <input inputMode="decimal" placeholder="set goal" value={data.targetWeight || ""}
            onChange={(e) => setData((d) => ({ ...d, targetWeight: e.target.value.replace(/[^0-9.]/g, "") }))}
            style={{ ...inputStyle, fontSize: 22, padding: "8px 10px", borderColor: C.good + "66" }} />
        </div>
        <div style={{ flex: "1 1 100%", fontSize: 13, color: C.dim }}>
          {(() => {
            const t = num(data.targetWeight);
            const latest = weights.length ? weights[weights.length - 1].w : null;
            if (t === null) return "Set a target and the Dashboard graphs your progress toward it. Weigh in 1–2× a week, same conditions.";
            if (latest === null) return `Target ${t} lbs set. Log your first weigh-in above to start the graph.`;
            const toGo = latest - t;
            return toGo > 0
              ? `${toGo.toFixed(1)} lbs to go → full graph on the Dashboard tab.`
              : "🎯 Target reached — time to set a new one or switch to maintenance.";
          })()}
        </div>
      </Card>

      <SectionLabel>What did you train? <span style={{ color: C.dim, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(pick any — stack two if life happened)</span></SectionLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={chip(day.activities.includes("run"), C.burn)} onClick={() => toggleActivity("run")}>🏃 Run</div>
        <div style={chip(day.activities.includes("A"), C.fuel)} onClick={() => toggleActivity("A")}>Strength A</div>
        <div style={chip(day.activities.includes("B"), C.fuel)} onClick={() => toggleActivity("B")}>Strength B</div>
      </div>
      {day.activities.length === 0 && (
        <div style={{ fontSize: 13, color: C.dim, marginTop: 8 }}>Rest day is a valid choice — you need ~3 of them a week. Weekly target: 2 runs + 2 strength, any days, any order.</div>
      )}

      {day.activities.includes("run") && RunCard()}
      {day.activities.includes("A") && StrengthCard({ id: "A" })}
      {day.activities.includes("B") && StrengthCard({ id: "B" })}

      <div style={{ marginTop: 20 }}>
        <Card>
          <div onClick={() => setCollapsed((c) => ({ ...c, garmin: !c.garmin }))}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <SectionLabel>Garmin log</SectionLabel>
            <div style={{ fontSize: 13, color: C.dim, fontWeight: 600, marginBottom: 10 }}>
              {(() => {
                const cin = num(day.calIn), out = (num(day.calActive) || 0) + (num(day.calResting) || 0);
                if (cin === null && !out) return collapsed.garmin ? "tap to log ▾" : "▴";
                return `${cin !== null ? cin.toLocaleString() : "—"} in · ${out ? out.toLocaleString() : "—"} out ${collapsed.garmin ? "▾" : "▴"}`;
              })()}
            </div>
          </div>
          {!collapsed.garmin && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {Field({ label: "Calories in", unit: "kcal · from MFP", value: day.calIn, onChange: (v) => setDay({ calIn: v }), color: C.fuel })}
            {Field({ label: "Active burn", unit: "kcal", value: day.calActive, onChange: (v) => setDay({ calActive: v }), color: C.burn })}
            {Field({ label: "Resting burn", unit: "kcal", value: day.calResting, onChange: (v) => setDay({ calResting: v }), color: C.burn })}
            {Field({ label: "Workout time", unit: "min", value: day.mins, onChange: (v) => setDay({ mins: v }) })}
            {Field({ label: "Steps", unit: "from Garmin", value: day.steps, onChange: (v) => setDay({ steps: v }) })}
            {Field({ label: "Sleep score", unit: "0–100", value: day.sleepScore, onChange: (v) => setDay({ sleepScore: v }) })}
            {Field({ label: "Sleep time", unit: "hours", value: day.sleepHours, onChange: (v) => setDay({ sleepHours: v }) })}
            </div>
          )}
        </Card>
      </div>

      {(() => {
        const entries = day.proteinEntries || [];
        const total = proteinOf(day);
        const pct = Math.min(100, (total / 200) * 100);
        const goalPct = (PROTEIN_GOAL / 200) * 100;
        const hit = total >= PROTEIN_GOAL;
        const addEntry = (g) => {
          if (!g || g <= 0) return;
          const migrated = entries.length === 0 && num(day.protein) ? [num(day.protein)] : entries;
          setDay({ proteinEntries: [...migrated, g], protein: "" });
        };
        const removeEntry = (i) => setDay({ proteinEntries: entries.filter((_, x) => x !== i) });
        const draft = drafts["protein"] || "";
        return (
          <div style={{ marginTop: 16 }}>
            <Card style={{ borderColor: hit ? C.good + "66" : C.line }}>
              <div onClick={() => setCollapsed((c) => ({ ...c, protein: !c.protein }))}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <SectionLabel>Protein</SectionLabel>
                <div style={{ fontSize: 13, fontWeight: 700, color: hit ? C.good : C.dim, marginBottom: 10 }}>
                  {total > 0 ? `${Math.round(total)}g · ${hit ? "goal hit ✓" : Math.ceil(PROTEIN_GOAL - total) + "g to go"}` : "tap to log"} {collapsed.protein ? "▾" : "▴"}
                </div>
              </div>
              {!collapsed.protein && (<div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: hit ? C.good : C.text }}>
                  {Math.round(total)}<span style={{ fontSize: 15, color: C.dim }}> / {PROTEIN_GOAL}g</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: hit ? C.good : C.dim }}>
                  {hit ? "✓ goal hit" : `${Math.max(0, Math.ceil(PROTEIN_GOAL - total))}g to go`}
                </div>
              </div>
              <div style={{ position: "relative", background: C.card2, borderRadius: 8, height: 14, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: hit ? C.good : C.fuel, borderRadius: 8, transition: "width .3s" }} />
                <div style={{ position: "absolute", left: `${goalPct}%`, top: 0, bottom: 0, width: 2, background: C.good }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {[10, 20, 30, 40].map((g) => (
                  <div key={g} onClick={() => addEntry(g)}
                    style={{ flex: 1, minWidth: 56, textAlign: "center", padding: "9px 0", borderRadius: 10, background: C.card2, border: `1px solid ${C.line}`, color: C.text, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                    +{g}g
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input inputMode="decimal" placeholder="custom grams, e.g. 47" value={draft}
                  onChange={(e) => setDrafts((s) => ({ ...s, protein: e.target.value.replace(/[^0-9.]/g, "") }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { addEntry(num(draft)); setDrafts((s) => ({ ...s, protein: "" })); } }}
                  style={{ ...inputStyle, flex: 1, fontSize: 15, padding: "9px 12px" }} />
                <div onClick={() => { addEntry(num(draft)); setDrafts((s) => ({ ...s, protein: "" })); }}
                  style={{ background: num(draft) ? C.fuel : C.card2, color: num(draft) ? C.onAccent : C.dim, borderRadius: 10, padding: "9px 16px", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center" }}>
                  Add
                </div>
                <div onClick={() => { const g = num(draft); if (g) { setDay({ proteinEntries: [g], protein: "" }); setDrafts((s) => ({ ...s, protein: "" })); } }}
                  title="Replace today's entries with this total (e.g. copied from MyFitnessPal)"
                  style={{ background: C.card2, color: num(draft) ? C.text : C.dim, borderRadius: 10, padding: "9px 12px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", border: `1px solid ${C.line}` }}>
                  = MFP total
                </div>
              </div>
              {(entries.length > 0 || num(day.protein)) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {num(day.protein) ? (
                    <div style={{ background: C.card2, borderRadius: 8, padding: "5px 10px", fontSize: 13, color: C.dim }}>{num(day.protein)}g (earlier)</div>
                  ) : null}
                  {entries.map((g, i) => (
                    <div key={i} style={{ background: C.card2, borderRadius: 8, padding: "5px 8px 5px 10px", fontSize: 13, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                      {g}g <span onClick={() => removeEntry(i)} style={{ color: C.dim, cursor: "pointer", fontWeight: 700 }}>×</span>
                    </div>
                  ))}
                </div>
              )}
              </div>)}
            </Card>
          </div>
        );
      })()}

      {EnergyLedger()}
    </div>
  );

  const PlanTab = () => (
    <div>
      <Card>
        <SectionLabel color={C.burn}>How this plan flexes</SectionLabel>
        <div style={{ fontSize: 15, lineHeight: 1.55, color: C.text }}>
          No fixed days. Hit <b>2 runs + 2 strength sessions per week</b>, in any order. Rules of thumb: keep ~48h between runs, alternate A and B, and if you stack a run + lift on one day, lift first or split morning/evening.
        </div>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <SectionLabel color={C.burn}>Zero → 30 min running · 10 weeks</SectionLabel>
        {Object.entries(RUN_WEEKS).map(([k, w]) => (
          <div key={k} style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: k > 1 ? `1px solid ${C.line}` : "none", alignItems: "baseline" }}>
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: parseInt(k) === data.runWeek ? C.burn : C.dim, width: 34, flexShrink: 0 }}>W{k}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{w.protocol}</div>
              <div style={{ fontSize: 13, color: C.dim }}>{w.detail}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 13, color: C.dim, marginTop: 8 }}>Every run: 5 min brisk walk warmup + 5 min cooldown. Repeat any week that felt hard.</div>
      </Card>
      {["A", "B"].map((id) => (
        <Card key={id} style={{ marginTop: 12 }}>
          <SectionLabel color={C.fuel}>{STRENGTH[id].name}</SectionLabel>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {["home", "gym"].map((m) => (
              <div key={m} style={{ flex: "1 1 45%", minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m === "home" ? "🏠 Home (bands + vest)" : "🏋️ Gym (Planet Fitness)"}</div>
                {[...STRENGTH[id][m], ...(((data.custom || {})[id] || {})[m] || [])].map((ex, i) => (
                  <div key={i} style={{ fontSize: 13, color: C.dim, padding: "4px 0" }}>
                    {ex}{i >= STRENGTH[id][m].length && <span style={{ fontSize: 11, color: C.dim, fontWeight: 700, marginLeft: 5 }}>MINE</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ))}
      <Card style={{ marginTop: 12 }}>
        <SectionLabel>Nutrition anchors</SectionLabel>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: C.text }}>
          Eat <b style={{ color: C.fuel }}>2,000–2,200 kcal/day</b> to start, then trust the app's real numbers over the estimate. Protein <b>160–180 g/day</b> — this is what makes it recomp instead of just weight loss. Weigh in 1–2× per week, same conditions. Expect ~1 lb/week down; if 2+ weeks stall, trim 100–150 kcal.
        </div>
      </Card>
    </div>
  );

  const DashTab = () => {
    const maxAbs = Math.max(...last7.map((d) => Math.abs(d.net ?? 0)), 600);
    const wDelta = weights.length >= 2 ? weights[weights.length - 1].w - weights[0].w : null;
    const avg = (field) => {
      const vals = last7.map((d) => (d.day ? num(d.day[field]) : null)).filter((v) => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const avgSteps = avg("steps"), avgScore = avg("sleepScore"), avgHours = avg("sleepHours");
    // weekly review
    const avgWin = (from, to) => {
      const vals = [];
      for (let i = from; i <= to; i++) {
        const dd = data.days[keyOffset(-i)];
        const v = dd ? num(dd.weight) : null;
        if (v !== null) vals.push(v);
      }
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const wNow = avgWin(0, 6), wPrev = avgWin(7, 13);
    const lossRate = wNow !== null && wPrev !== null ? wPrev - wNow : null; // lbs/week
    const lossPct = lossRate !== null && wPrev ? (lossRate / wPrev) * 100 : null;
    const avgProt = (() => {
      const vals = last7.map((d) => (d.day ? proteinOf(d.day) : 0)).filter((v) => v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    })();
    const sessions = weekStats.runs + weekStats.strength;
    const deficitTarget = Math.max(1, weekStats.logged) * DAILY_DEFICIT_GOAL;
    let headline, headColor;
    if (lossPct !== null && lossPct > 1.5) {
      headline = `Losing ${lossRate.toFixed(1)} lb/wk — too fast. Eat ~200 kcal more per day or you'll burn muscle with the fat.`;
      headColor = C.bad;
    } else if (lossRate !== null && lossRate < 0.2 && weekStats.logged >= 4 && weekStats.deficit >= 2000) {
      headline = "Scale flat despite a real deficit. Hold one more week (water noise), then trim 100–150 kcal/day if still stuck.";
      headColor = C.burn;
    } else if (sessions >= 4 && weekStats.deficit >= deficitTarget * 0.8 && (lossRate === null || lossRate >= 0.2)) {
      headline = "On pace. Change nothing — consistency is the whole program.";
      headColor = C.good;
    } else if (weekStats.logged < 3 && sessions < 2) {
      headline = "Not enough data this week for a verdict. Log days — even bad ones count.";
      headColor = C.dim;
    } else {
      headline = "Partial week. Close the gaps below and the verdict improves.";
      headColor = C.burn;
    }
    const reviewLines = [
      { ok: sessions >= 4, txt: `Training: ${weekStats.runs}/2 runs · ${weekStats.strength}/2 strength` },
      { ok: weekStats.deficit >= deficitTarget * 0.8, txt: `Deficit: ${weekStats.deficit >= 0 ? "−" : "+"}${Math.abs(Math.round(weekStats.deficit)).toLocaleString()} kcal over ${weekStats.logged} logged day${weekStats.logged === 1 ? "" : "s"} (goal −${deficitTarget.toLocaleString()})` },
      { ok: avgProt !== null && avgProt >= 150, txt: avgProt === null ? "Protein: not logged yet" : `Protein: ${Math.round(avgProt)}g/day average (goal 160+)` },
      { ok: lossRate !== null && lossRate >= 0.2 && (lossPct === null || lossPct <= 1.5), txt: lossRate === null ? "Weight: need weigh-ins in both of the last two weeks" : `Weight: ${lossRate >= 0 ? "−" : "+"}${Math.abs(lossRate).toFixed(1)} lb vs last week's average` },
    ];
    return (
      <div>
        <Card style={{ marginBottom: 12, borderColor: headColor + "66" }}>
          <SectionLabel color={headColor}>Weekly review · coach's verdict</SectionLabel>
          <div style={{ fontSize: 15, fontWeight: 700, color: headColor, lineHeight: 1.4, marginBottom: 10 }}>{headline}</div>
          {reviewLines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "4px 0", fontSize: 13 }}>
              <span style={{ color: l.ok ? C.good : C.dim, fontWeight: 800, width: 14, flexShrink: 0 }}>{l.ok ? "✓" : "○"}</span>
              <span style={{ color: l.ok ? C.text : C.dim }}>{l.txt}</span>
            </div>
          ))}
        </Card>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
            <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: C.burn }}>{weekStats.runs}<span style={{ fontSize: 18, color: C.dim }}>/{WEEKLY_TARGET.runs}</span></div>
            <div style={{ fontSize: 13, color: C.dim }}>runs this week</div>
          </Card>
          <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
            <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: C.fuel }}>{weekStats.strength}<span style={{ fontSize: 18, color: C.dim }}>/{WEEKLY_TARGET.strength}</span></div>
            <div style={{ fontSize: 13, color: C.dim }}>strength this week</div>
          </Card>
          <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
            <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: weekStats.deficit >= 0 ? C.good : C.bad }}>
              {weekStats.deficit >= 0 ? "−" : "+"}{Math.abs(Math.round(weekStats.deficit)).toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: C.dim }}>week deficit · goal 3,500 kcal ({weekStats.logged}d logged)</div>
          </Card>
          <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
            <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: C.text }}>{totalSessions}</div>
            <div style={{ fontSize: 13, color: C.dim }}>total sessions logged</div>
          </Card>
          <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
            <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: avgSteps === null ? C.dim : avgSteps >= 8000 ? C.good : C.text }}>
              {avgSteps === null ? "—" : Math.round(avgSteps).toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: C.dim }}>avg steps / 7d · aim 8k+</div>
          </Card>
          <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: "center" }}>
            <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: avgHours === null ? C.dim : avgHours >= 7 ? C.good : C.burn }}>
              {avgHours === null ? "—" : avgHours.toFixed(1) + "h"}
              {avgScore !== null && <span style={{ fontSize: 17, color: C.dim }}> · {Math.round(avgScore)}</span>}
            </div>
            <div style={{ fontSize: 13, color: C.dim }}>avg sleep / 7d · muscle is built here</div>
          </Card>
        </div>

        <Card style={{ marginTop: 12 }}>
          <SectionLabel>Last 7 days · daily balance</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 6, height: 150 }}>
            {last7.map(({ k, net: n, day: dd }) => {
              const h = n === null ? 0 : Math.min(60, (Math.abs(n) / maxAbs) * 60);
              const deficit = n !== null && n < 0;
              const trained = dd && (dd.activities || []).length > 0;
              return (
                <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", alignItems: "center" }}>
                    <div style={{ height: 60, display: "flex", alignItems: "flex-end", width: "70%" }}>
                      {!deficit && n !== null && <div style={{ width: "100%", height: h, background: C.bad, borderRadius: 5 }} />}
                    </div>
                    <div style={{ height: 1.5, width: "100%", background: C.line }} />
                    <div style={{ height: 60, display: "flex", alignItems: "flex-start", width: "70%" }}>
                      {deficit && <div style={{ width: "100%", height: h, background: C.good, borderRadius: 5 }} />}
                      {n === null && <div style={{ width: "100%", height: 5, background: C.card2, borderRadius: 3, marginTop: 2 }} />}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{shortDay(k)}</div>
                  <div style={{ fontSize: 13 }}>{trained ? "●" : " "}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: C.dim, textAlign: "center" }}>
            <span style={{ color: C.good }}>■</span> below the line = deficit · <span style={{ color: C.bad }}>■</span> above = surplus · ● = trained
          </div>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionLabel>Weight</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</span>
              <input inputMode="decimal" placeholder="lbs" value={data.targetWeight || ""}
                onChange={(e) => setData((d) => ({ ...d, targetWeight: e.target.value.replace(/[^0-9.]/g, "") }))}
                style={{ ...inputStyle, width: 72, padding: "7px 8px", fontSize: 15, textAlign: "center" }} />
            </div>
          </div>
          {weights.length === 0 ? (
            <div style={{ fontSize: 13, color: C.dim }}>Log a weigh-in on the Today tab (1–2× per week is plenty). Set your target above and the graph builds itself.</div>
          ) : (() => {
            const target = num(data.targetWeight);
            const pts = weights.slice(-24);
            const ys = pts.map((p) => p.w).concat(target !== null ? [target] : []);
            const yMin = Math.min(...ys) - 2, yMax = Math.max(...ys) + 2;
            const W = 320, H = 130, padL = 34, padR = 8, padT = 10, padB = 20;
            const X = (i) => padL + (pts.length === 1 ? (W - padL - padR) / 2 : (i / (pts.length - 1)) * (W - padL - padR));
            const Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - padT - padB);
            const path = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join(" ");
            const last = pts[pts.length - 1].w;
            const toGo = target !== null ? last - target : null;
            return (
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700 }}>{last}<span style={{ fontSize: 15, color: C.dim }}> lbs</span></div>
                  {wDelta !== null && (
                    <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 700, color: wDelta <= 0 ? C.good : C.bad }}>
                      {wDelta <= 0 ? "" : "+"}{wDelta.toFixed(1)} since start
                    </div>
                  )}
                  {toGo !== null && toGo > 0 && (
                    <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 700, color: C.burn }}>{toGo.toFixed(1)} to go</div>
                  )}
                  {toGo !== null && toGo <= 0 && (
                    <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 700, color: C.good }}>🎯 target reached</div>
                  )}
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
                  {[yMax, (yMax + yMin) / 2, yMin].map((v, i) => (
                    <g key={i}>
                      <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke={C.line} strokeWidth="1" />
                      <text x={padL - 5} y={Y(v) + 3.5} textAnchor="end" fontSize="9" fill={C.dim}>{Math.round(v)}</text>
                    </g>
                  ))}
                  {target !== null && (
                    <g>
                      <line x1={padL} x2={W - padR} y1={Y(target)} y2={Y(target)} stroke={C.good} strokeWidth="1.5" strokeDasharray="5 4" />
                      <text x={W - padR} y={Y(target) - 4} textAnchor="end" fontSize="9" fontWeight="700" fill={C.good}>target {target}</text>
                    </g>
                  )}
                  <path d={path} fill="none" stroke={C.burn} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  {pts.map((p, i) => (
                    <circle key={p.k} cx={X(i)} cy={Y(p.w)} r={i === pts.length - 1 ? 4 : 2.6} fill={i === pts.length - 1 ? C.burn : C.card} stroke={C.burn} strokeWidth="1.5" />
                  ))}
                  <text x={X(0)} y={H - 4} fontSize="9" fill={C.dim}>{pts[0].k.slice(5)}</text>
                  <text x={X(pts.length - 1)} y={H - 4} textAnchor="end" fontSize="9" fill={C.dim}>{pts[pts.length - 1].k.slice(5)}</text>
                </svg>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Judge the trend line, not single weigh-ins — daily water swings are 2–4 lbs of noise.</div>
              </div>
            );
          })()}
        </Card>
      </div>
    );
  };

  // ---------- shell ----------
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;600;700&display=swap');
        input::placeholder { color: ${C.placeholder}; }
        select:focus, input:focus { border-color: ${C.burn} !important; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "18px 14px 90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 26, fontWeight: 700, letterSpacing: "0.01em" }}>
              RECOMP<span style={{ color: C.burn }}>·</span>LOG
            </div>
            <div style={{ fontSize: 11, color: C.dim }}>2 runs + 2 lifts a week · −500 kcal/day · 160g+ protein</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, color: saveState === "error" ? C.bad : C.dim }}>
              {saveState === "saving" ? "saving…" : saveState === "saved" ? "✓ saved" : saveState === "error" ? "save failed" : ""}
            </div>
            <div onClick={() => setData((d) => ({ ...d, theme: theme === "dark" ? "light" : "dark" }))}
              style={{ cursor: "pointer", fontSize: 15, background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "5px 10px", lineHeight: 1 }}
              title="Toggle light/dark theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </div>
          </div>
        </div>

        {!loaded ? (
          <div style={{ textAlign: "center", color: C.dim, padding: 40 }}>Loading your log…</div>
        ) : tab === "today" ? TodayTab() : tab === "plan" ? PlanTab() : DashTab()}
      </div>

      {/* bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.navBg, backdropFilter: "blur(8px)", borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex" }}>
          {[["today", "Today"], ["plan", "Plan"], ["dash", "Dashboard"]].map(([id, label]) => (
            <div key={id} onClick={() => setTab(id)}
              style={{ flex: 1, textAlign: "center", padding: "13px 0 16px", cursor: "pointer", fontSize: 13, fontWeight: 700,
                color: tab === id ? C.burn : C.dim, borderTop: `2px solid ${tab === id ? C.burn : "transparent"}` }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
