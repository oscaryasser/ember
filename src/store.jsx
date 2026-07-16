import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { kvGet, kvSet } from "./lib/idb.js";
import { todayKey } from "./lib/dates.js";
import { sanitizeDay, safeParse, pickFresher } from "./lib/util.js";

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
  calTarget: "",       // daily intake target; blank = auto from measured TDEE − deficit
  carbs: "",           // carb g target; blank = auto (calories left after protein + fat)
  fat: "",             // fat g target; blank = auto (30% of calories)
};

const emptyDay = () => ({
  activities: [], runWeek: null, checks: {},
  calIn: "", calActive: "", calResting: "", mins: "",
  protein: "", weight: "", steps: "", sleepScore: "", sleepHours: "", napHours: "",
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
    foods: Array.isArray(d.foods) ? d.foods.filter((f) => f && typeof f === "object" && typeof f.name === "string") : [],
    customRun: d.customRun && typeof d.customRun === "object" ? d.customRun : null,
    goals: { ...DEFAULT_GOALS, ...(d.goals || {}), ...(!d.goals && d.targetWeight ? { targetWeight: d.targetWeight } : {}) },
  };
}

// Read BOTH stores and take the newer good copy. A corrupt or stale
// localStorage (truncated write, quota failure) must never beat the mirror —
// booting empty here would overwrite the mirror on the next save.
async function loadInitial() {
  let ls = null, mirror = null;
  try { ls = safeParse(localStorage.getItem(KEY)); } catch { /* private mode etc. */ }
  try { mirror = safeParse(await kvGet(KEY)); } catch { /* no mirror */ }
  return migrate(pickFresher(ls, mirror));
}

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }) {
  const [data, setData] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimer = useRef(null);
  const loadedRef = useRef(false);
  const dataRef = useRef(null);          // latest state, for the flush handlers
  const pendingRef = useRef(false);      // a debounced save is queued
  const lastWrittenAt = useRef(0);       // savedAt of our most recent write/load

  dataRef.current = data;

  useEffect(() => {
    loadInitial().then((d) => {
      lastWrittenAt.current = Date.now();
      setData(d);
      loadedRef.current = true;
    });
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  }, []);

  // The actual dual write. Synchronous localStorage first — this is the part
  // that must land even when iOS is about to suspend the page.
  const persistNow = useCallback((d) => {
    const savedAt = Date.now();
    const json = JSON.stringify({ ...d, savedAt });
    lastWrittenAt.current = savedAt;
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
  }, []);

  // Debounced save for normal typing…
  useEffect(() => {
    if (!loadedRef.current || data === null) return;
    setSaveState("saving");
    pendingRef.current = true;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      pendingRef.current = false;
      persistNow(data);
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [data, persistNow]);

  // …but NEVER let a pending save die with the page. iOS suspends PWAs the
  // moment they background — "add food, lock phone" must not lose the food.
  useEffect(() => {
    const flush = () => {
      if (!pendingRef.current || dataRef.current === null) return;
      clearTimeout(saveTimer.current);
      pendingRef.current = false;
      persistNow(dataRef.current);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
      else if (!pendingRef.current) {
        // On resume, adopt a newer copy written by another tab/instance.
        const stored = safeParse((() => { try { return localStorage.getItem(KEY); } catch { return null; } })());
        if (stored?.savedAt && stored.savedAt > lastWrittenAt.current) {
          lastWrittenAt.current = stored.savedAt;
          setData(migrate(stored));
        }
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [persistNow]);

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
