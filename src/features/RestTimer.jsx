import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cues } from "../lib/audio.js";
import { fmtClock } from "../lib/dates.js";

// Global rest timer: any strength card can start it; a floating pill above the
// nav shows the countdown with +30s. Timestamp-based so backgrounding is safe.

const RestCtx = createContext({ startRest: () => {}, restRemaining: 0, restActive: false, addRest: () => {}, stopRest: () => {} });
export const useRestTimer = () => useContext(RestCtx);

export function RestTimerProvider({ children, defaultSecs = 90 }) {
  const [endsAt, setEndsAt] = useState(null);
  const [, force] = useState(0);
  const firedRef = useRef(false);

  const startRest = useCallback((secs) => {
    firedRef.current = false;
    setEndsAt(Date.now() + (secs || defaultSecs) * 1000);
  }, [defaultSecs]);

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => {
      if (Date.now() >= endsAt) {
        if (!firedRef.current) {
          firedRef.current = true;
          cues.restDone();
        }
        setEndsAt(null);
      } else {
        force((x) => x + 1);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining = endsAt ? Math.max(0, (endsAt - Date.now()) / 1000) : 0;
  const addRest = useCallback(() => setEndsAt((e) => (e ? e + 30000 : e)), []);
  const stopRest = useCallback(() => setEndsAt(null), []);

  return (
    <RestCtx.Provider value={{ startRest, restRemaining: remaining, restActive: !!endsAt, addRest, stopRest }}>
      {children}
      {endsAt && (
        <div className="rest-bar fade-in">
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)", letterSpacing: "0.08em" }}>REST</span>
          <span className="display" style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 58, textAlign: "center" }}>
            {fmtClock(remaining)}
          </span>
          <button className="btn" style={{ padding: "6px 12px", borderRadius: 999, fontSize: 13 }}
            onClick={() => setEndsAt((e) => e + 30000)}>
            +30s
          </button>
          <button className="btn ghost" style={{ padding: "6px 8px", fontSize: 15 }} onClick={() => setEndsAt(null)}>
            ✕
          </button>
        </div>
      )}
    </RestCtx.Provider>
  );
}
