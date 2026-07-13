import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { kvGet, kvSet } from "./lib/idb.js";
import { todayKey } from "./lib/dates.js";
import { sanitizeDay } from "./lib/util.js";

const KEY = "ember:data:v1";

export const DEFAULT_GOALS = {
  protein: 160,        // g/day
  deficit: 500,        // kcal/day
  steps: 8000,         // steps/day
  sleepHours: 7,       // h/night
  targetWeight: "",    // lbs
  weeklyRuns: 2,
  weeklyStrength: 2,
  maxLossPct: 1.5,     // % bodyweight per week — faster than this burns muscle
  restSecs: 90,        // strength rest timer
  pullupDays: 5,       // grease-the-groove days per week
  pullupTarget: 10,    // strict-rep goal on the max-test chart
};

const emptyDay = () => ({
  activities: [], runWeek: null, checks: {},
  calIn: "", calActive: "", calResting: "", mins: "",
  protein: "", weight: "", steps: "", sleepScore: "", sleepHours: "",
});
// Read-only fallback for days that don't exist yet. Deep-frozen so an
// accidental mutation throws in dev instead of corrupting every empty day.
export const EMPTY_DAY = Object.freeze({ ...emptyDay(), activities: Object.freeze([]), checks: Object.freeze({}) });

function migrate(parsed) {
  const d = parsed && typeof parsed === "object" ? parsed : {};
  const days = {};
  if (d.days && typeof d.days === "object") {
    for (const [k, v] of Object.entries(d.days)) {
      const clean = sanitizeDay(v);
      if (clean) days[k] = clean;
    }
  }
  return {
    version: 1,
    theme: d.theme === "light" ? "light" : "dark",
    days,
    runWeek: d.runWeek || 1,
    runAck: d.runAck || {},
    custom: d.custom || {},
    goals: { ...DEFAULT_GOALS, ...(d.goals || {}), ...(!d.goals && d.targetWeight ? { targetWeight: d.targetWeight } : {}) },
  };
}

const safeParse = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  try {
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : null;
  } catch { return null; }
};

// Read BOTH stores and take the newer good copy. A corrupt or stale
// localStorage (truncated write, quota failure) must never beat the mirror —
// booting empty here would overwrite the mirror on the next save.
async function loadInitial() {
  let ls = null, mirror = null;
  try { ls = safeParse(localStorage.getItem(KEY)); } catch { /* private mode etc. */ }
  try { mirror = safeParse(await kvGet(KEY)); } catch { /* no mirror */ }
  const parsed = !ls ? mirror : !mirror ? ls
    : (mirror.savedAt || 0) > (ls.savedAt || 0) ? mirror : ls;
  return migrate(parsed);
}

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }) {
  const [data, setData] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimer = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadInitial().then((d) => {
      setData(d);
      loadedRef.current = true;
    });
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  }, []);

  // Debounced dual-write: localStorage (verified read-back) + IndexedDB mirror.
  useEffect(() => {
    if (!loadedRef.current || data === null) return;
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // savedAt lets loadInitial pick the newer copy when the two stores diverge.
      const json = JSON.stringify({ ...data, savedAt: Date.now() });
      let ok = false;
      try {
        localStorage.setItem(KEY, json);
        ok = localStorage.getItem(KEY) === json;
      } catch { ok = false; }
      kvSet(KEY, json)
        .then(() => {
          setSaveState("saved");
          setLastSaved(new Date());
          setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
        })
        .catch(() => {
          if (ok) {
            setSaveState("saved");
            setLastSaved(new Date());
            setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);
          } else setSaveState("error");
        });
      if (!ok) {
        // localStorage failed — the IDB write above is the safety net; if it also
        // failed the catch branch shows the error state.
      }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [data]);

  const update = useCallback((fn) => setData((d) => (d === null ? d : fn(d))), []);

  const value = useMemo(
    () => ({ data, update, saveState, lastSaved, loaded: data !== null }),
    [data, update, saveState, lastSaved]
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

// ----- day helpers (pure, take data) -----
export const getDay = (data, key) => data.days[key] || EMPTY_DAY;

export const patchDay = (update, key) => (patch) =>
  update((d) => ({
    ...d,
    days: { ...d.days, [key]: { ...emptyDay(), ...(d.days[key] || {}), ...patch } },
  }));

export { todayKey, KEY as STORAGE_KEY };
