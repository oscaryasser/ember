import { useEffect, useMemo, useRef, useState } from "react";
import { RUN_WEEKS, buildRunSegments, buildCustomSegments, totalSecs } from "../plan.js";
import { fmtClock } from "../lib/dates.js";
import { unlockAudio, cues } from "../lib/audio.js";
import { keepAwake, releaseAwake } from "../lib/wakeLock.js";
import { Seg } from "../components/ui.jsx";

// Stepper for the custom-session builder.
const Step = ({ label, value, onChange, min, max, inc = 1, unit }) => (
  <div style={{ flex: 1, textAlign: "center" }}>
    <div className="field-label" style={{ textAlign: "center" }}>{label}</div>
    <div className="row" style={{ gap: 6, justifyContent: "center" }}>
      <button className="btn" style={{ width: 40, fontWeight: 800 }} onClick={() => onChange(Math.max(min, +(value - inc).toFixed(1)))}>−</button>
      <div className="display" style={{ fontSize: 22, fontWeight: 700, minWidth: 44 }}>{value}{unit}</div>
      <button className="btn" style={{ width: 40, fontWeight: 800 }} onClick={() => onChange(Math.min(max, +(value + inc).toFixed(1)))}>+</button>
    </div>
  </div>
);

// Bright accents on dark segment backgrounds — high contrast even for the
// blue walk/warmup states (the old cyan-on-navy was hard to read mid-run).
const SEG_STYLE = {
  jog:    { bg: "#3a1c07", accent: "#ff9a4d", verb: "JOG" },
  walk:   { bg: "#0b2b38", accent: "#63d3ec", verb: "WALK" },
  warmup: { bg: "#1b2130", accent: "#a7bcd2", verb: "WARM UP · WALK" },
  cool:   { bg: "#1b2130", accent: "#a7bcd2", verb: "COOL DOWN · WALK" },
};
const LIGHT = "#eef2f7";
const DIM_ON_DARK = "rgba(255,255,255,0.66)";

// Locate the active segment for an elapsed time.
function locate(segments, elapsed) {
  let acc = 0;
  for (let i = 0; i < segments.length; i++) {
    acc += segments[i].secs;
    if (elapsed < acc) return { i, remaining: acc - elapsed };
  }
  return { i: segments.length, remaining: 0 };
}

export default function RunTimer({ week, customCfg, onCustomChange, onComplete, onClose }) {
  const rw = RUN_WEEKS[week];
  const [variant, setVariant] = useState(0);
  const [mode, setMode] = useState("plan"); // plan | intervals | free
  const [cfg, setCfg] = useState(customCfg || { reps: 5, jogMins: 3, walkMins: 1.5, mins: 30 });
  const segments = useMemo(
    () => (mode === "plan" ? buildRunSegments(week, variant) : buildCustomSegments({ ...cfg, kind: mode === "free" ? "free" : "intervals" })),
    [mode, week, variant, cfg]
  );
  const total = useMemo(() => totalSecs(segments), [segments]);
  const title = mode === "plan" ? `${rw.label} run` : mode === "free" ? "Free run" : "Custom intervals";
  const subtitle = mode === "plan" ? rw.protocol : mode === "free" ? `${cfg.mins} min continuous` : `${cfg.reps} × (${cfg.jogMins} min run / ${cfg.walkMins} min walk)`;

  const [phase, setPhase] = useState("ready"); // ready | running | paused | done
  const [now, setNow] = useState(0);
  const [skip, setSkip] = useState(0); // seconds jumped past via the Skip button
  const startedAt = useRef(0);
  const pausedAt = useRef(0);
  const pausedTotal = useRef(0);
  const lastSeg = useRef(-1);
  const lastTick = useRef("");
  const doneFired = useRef(false);

  const elapsed = phase === "ready" ? 0
    : (phase === "paused" ? pausedAt.current : now) / 1000 - startedAt.current / 1000 - pausedTotal.current / 1000 + skip;
  const loc = locate(segments, Math.max(0, elapsed));
  const seg = segments[Math.min(loc.i, segments.length - 1)];
  const finished = phase === "done";

  // Tick loop: timestamp math only, so a missed tick never skews the schedule.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    const onVis = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [phase]);

  // Cues: fire on segment boundary crossings + 3-2-1 countdown ticks.
  useEffect(() => {
    if (phase !== "running") return;
    if (loc.i >= segments.length) {
      if (!doneFired.current) {
        doneFired.current = true;
        cues.done();
        releaseAwake();
        setPhase("done");
        onComplete?.({ week, totalMins: Math.round(total / 60) });
      }
      return;
    }
    if (loc.i !== lastSeg.current) {
      // Skip the audible cue for the very first segment (start tap covers it).
      if (lastSeg.current !== -1) {
        (seg.type === "jog" ? cues.jog : cues.walk)();
      }
      lastSeg.current = loc.i;
    }
    const rem = Math.ceil(loc.remaining);
    if (rem <= 3 && rem >= 1) {
      const key = `${loc.i}:${rem}`;
      if (lastTick.current !== key) {
        lastTick.current = key;
        cues.countTick();
      }
    }
  }, [phase, loc.i, loc.remaining, seg, segments.length, onComplete, total, week]);

  useEffect(() => () => releaseAwake(), []);

  const start = () => {
    unlockAudio();
    keepAwake();
    startedAt.current = Date.now();
    pausedTotal.current = 0;
    lastSeg.current = -1;
    setSkip(0);
    setNow(Date.now());
    setPhase("running");
  };
  // Jump to the end of the current segment (skip warmup, a walk, a recovery…).
  const skipSegment = () => {
    unlockAudio();
    setSkip((s) => s + Math.ceil(loc.remaining) + 0.01);
    setNow(Date.now());
  };
  const pause = () => { pausedAt.current = Date.now(); setPhase("paused"); };
  const resume = () => {
    unlockAudio();
    pausedTotal.current += Date.now() - pausedAt.current;
    setNow(Date.now());
    setPhase("running");
  };
  const endEarly = () => {
    if (!confirm("End this run early? It won't be marked complete.")) return;
    releaseAwake();
    onClose();
  };

  const style = SEG_STYLE[seg?.type] || SEG_STYLE.warmup;
  const progress = Math.min(1, elapsed / total);
  const next = segments[loc.i + 1];

  return (
    <div className="timer-overlay" style={{ background: finished ? "var(--bg)" : phase === "ready" ? "var(--bg)" : style.bg }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>{subtitle}</div>
        </div>
        <button className="btn ghost" onClick={phase === "ready" || finished ? onClose : endEarly}>
          {phase === "ready" || finished ? "Close" : "End"}
        </button>
      </div>

      {phase === "ready" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          <div style={{ alignSelf: "center" }}>
            <Seg
              options={[["plan", `Week ${week}`], ["intervals", "Intervals"], ["free", "Free run"]]}
              value={mode}
              onChange={(m) => { setMode(m); if (m !== "plan") onCustomChange?.(cfg); }}
            />
          </div>
          {mode === "intervals" && (
            <div className="row" style={{ gap: 8 }}>
              <Step label="Rounds" value={cfg.reps} min={1} max={20} onChange={(v) => { const c = { ...cfg, reps: v }; setCfg(c); onCustomChange?.(c); }} />
              <Step label="Run" value={cfg.jogMins} min={0.5} max={30} inc={0.5} unit="m" onChange={(v) => { const c = { ...cfg, jogMins: v }; setCfg(c); onCustomChange?.(c); }} />
              <Step label="Walk" value={cfg.walkMins} min={0.5} max={10} inc={0.5} unit="m" onChange={(v) => { const c = { ...cfg, walkMins: v }; setCfg(c); onCustomChange?.(c); }} />
            </div>
          )}
          {mode === "free" && (
            <div className="row">
              <Step label="Duration" value={cfg.mins} min={5} max={180} inc={5} unit="m" onChange={(v) => { const c = { ...cfg, mins: v }; setCfg(c); onCustomChange?.(c); }} />
            </div>
          )}
          {mode === "plan" && rw.continuous && rw.continuous.length > 1 && (
            <div>
              <div className="section-label">Which run this week?</div>
              <div className="chips">
                {rw.continuous.map((m, i) => (
                  <button key={m} className="chip" onClick={() => setVariant(i)} aria-pressed={variant === i}
                    style={variant === i ? { borderColor: "var(--ember)", background: "color-mix(in srgb, var(--ember) 13%, transparent)", color: "var(--ember)" } : undefined}>
                    {m} min {i === 0 ? "(first run)" : "(second run)"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="section-label">Session</div>
            {segments.map((s, i) => (
              <div key={i} className="row" style={{ padding: "6px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: s.type === "jog" ? "var(--ember)" : "var(--fuel)", flexShrink: 0 }} />
                <div className="grow" style={{ fontSize: 14 }}>{s.label}</div>
                <div className="display" style={{ fontSize: 15, color: "var(--dim)" }}>{fmtClock(s.secs)}</div>
              </div>
            ))}
            <div className="row" style={{ padding: "8px 0 0", justifyContent: "flex-end" }}>
              <div style={{ fontSize: 13, color: "var(--dim)" }}>Total {fmtClock(total)}</div>
            </div>
          </div>
          <button className="btn primary display" style={{ fontSize: 22, padding: "16px 0", borderRadius: 16 }} onClick={start}>
            ▶ Start run
          </button>
          <div style={{ fontSize: 12, color: "var(--dim)", textAlign: "center" }}>
            Beeps + vibration on every switch. Screen stays awake. Keep the volume up.
          </div>
        </div>
      )}

      {(phase === "running" || phase === "paused") && seg && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 8, color: LIGHT }}>
          <div className="display" style={{ fontSize: 30, fontWeight: 700, color: style.accent, letterSpacing: "0.08em" }}>
            {style.verb}
          </div>
          <div style={{ fontSize: 14, color: DIM_ON_DARK }}>{seg.label}</div>
          <div className="display" style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: LIGHT }}>
            {fmtClock(loc.remaining)}
          </div>
          {next ? (
            <div style={{ display: "inline-flex", alignSelf: "center", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.32)" }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.72)" }}>NEXT</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{next.label} · {fmtClock(next.secs)}</span>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: DIM_ON_DARK }}>Last segment — bring it home</div>
          )}
          <div style={{ margin: "18px 0 6px" }}>
            <div style={{ background: "rgba(255,255,255,0.16)", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${progress * 100}%`, height: "100%", background: style.accent, borderRadius: 6, transition: "width 0.3s linear" }} />
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 6, fontSize: 12, color: DIM_ON_DARK }}>
              <span>{fmtClock(elapsed)}</span>
              <span>−{fmtClock(Math.max(0, total - elapsed))}</span>
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button
              className="btn grow"
              style={{ padding: "14px 0", fontSize: 17, borderRadius: 14, background: "rgba(255,255,255,0.14)", color: "#fff", borderColor: "rgba(255,255,255,0.28)" }}
              onClick={phase === "running" ? pause : resume}
            >
              {phase === "running" ? "❚❚ Pause" : "▶ Resume"}
            </button>
            <button
              className="btn grow"
              style={{ padding: "14px 0", fontSize: 17, borderRadius: 14, background: "rgba(255,255,255,0.14)", color: "#fff", borderColor: "rgba(255,255,255,0.28)" }}
              onClick={skipSegment}
            >
              Skip ▸
            </button>
          </div>
        </div>
      )}

      {finished && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 14 }}>
          <div style={{ fontSize: 56 }}>🔥</div>
          <div className="display" style={{ fontSize: 30, fontWeight: 700 }}>Run complete</div>
          <div style={{ color: "var(--dim)", fontSize: 15 }}>
            {title} logged and marked done. Grab the distance off your Garmin and drop it in the run card.
          </div>
          <button className="btn primary display" style={{ fontSize: 20, padding: "14px 0", borderRadius: 16 }} onClick={onClose}>
            Log distance
          </button>
        </div>
      )}
    </div>
  );
}
