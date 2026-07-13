import { useEffect, useMemo, useRef, useState } from "react";
import { RUN_WEEKS, buildRunSegments, totalSecs } from "../plan.js";
import { fmtClock } from "../lib/dates.js";
import { unlockAudio, cues } from "../lib/audio.js";
import { keepAwake, releaseAwake } from "../lib/wakeLock.js";

const SEG_STYLE = {
  jog:    { bg: "#3d1d08", accent: "var(--ember)", verb: "JOG" },
  walk:   { bg: "#0e2833", accent: "var(--fuel)",  verb: "WALK" },
  warmup: { bg: "#131720", accent: "var(--fuel)",  verb: "WARM UP · WALK" },
  cool:   { bg: "#131720", accent: "var(--fuel)",  verb: "COOL DOWN · WALK" },
};

// Locate the active segment for an elapsed time.
function locate(segments, elapsed) {
  let acc = 0;
  for (let i = 0; i < segments.length; i++) {
    acc += segments[i].secs;
    if (elapsed < acc) return { i, remaining: acc - elapsed };
  }
  return { i: segments.length, remaining: 0 };
}

export default function RunTimer({ week, onComplete, onClose }) {
  const rw = RUN_WEEKS[week];
  const [variant, setVariant] = useState(0);
  const segments = useMemo(() => buildRunSegments(week, variant), [week, variant]);
  const total = useMemo(() => totalSecs(segments), [segments]);

  const [phase, setPhase] = useState("ready"); // ready | running | paused | done
  const [now, setNow] = useState(0);
  const startedAt = useRef(0);
  const pausedAt = useRef(0);
  const pausedTotal = useRef(0);
  const lastSeg = useRef(-1);
  const lastTick = useRef("");
  const doneFired = useRef(false);

  const elapsed = phase === "ready" ? 0
    : (phase === "paused" ? pausedAt.current : now) / 1000 - startedAt.current / 1000 - pausedTotal.current / 1000;
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
    setNow(Date.now());
    setPhase("running");
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
          <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>{rw.label} run</div>
          <div style={{ fontSize: 13, color: "var(--dim)" }}>{rw.protocol}</div>
        </div>
        <button className="btn ghost" onClick={phase === "ready" || finished ? onClose : endEarly}>
          {phase === "ready" || finished ? "Close" : "End"}
        </button>
      </div>

      {phase === "ready" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          {rw.continuous && rw.continuous.length > 1 && (
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 8 }}>
          <div className="display" style={{ fontSize: 26, fontWeight: 700, color: style.accent, letterSpacing: "0.08em" }}>
            {style.verb}
          </div>
          <div style={{ fontSize: 14, color: "var(--dim)" }}>{seg.label}</div>
          <div className="display" style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {fmtClock(loc.remaining)}
          </div>
          {next ? (
            <div style={{ fontSize: 14, color: "var(--dim)" }}>
              Next: <b style={{ color: "var(--text)" }}>{next.label}</b> · {fmtClock(next.secs)}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: "var(--dim)" }}>Last segment — bring it home</div>
          )}
          <div style={{ margin: "18px 0 6px" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${progress * 100}%`, height: "100%", background: style.accent, borderRadius: 6, transition: "width 0.3s linear" }} />
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--dim)" }}>
              <span>{fmtClock(elapsed)}</span>
              <span>−{fmtClock(total - elapsed)}</span>
            </div>
          </div>
          <button
            className="btn"
            style={{ padding: "14px 0", fontSize: 17, borderRadius: 14 }}
            onClick={phase === "running" ? pause : resume}
          >
            {phase === "running" ? "❚❚ Pause" : "▶ Resume"}
          </button>
        </div>
      )}

      {finished && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 14 }}>
          <div style={{ fontSize: 56 }}>🔥</div>
          <div className="display" style={{ fontSize: 30, fontWeight: 700 }}>Run complete</div>
          <div style={{ color: "var(--dim)", fontSize: 15 }}>
            {rw.label} logged and marked done. Grab the distance off your Garmin and drop it in the run card.
          </div>
          <button className="btn primary display" style={{ fontSize: 20, padding: "14px 0", borderRadius: 16 }} onClick={onClose}>
            Log distance
          </button>
        </div>
      )}
    </div>
  );
}
