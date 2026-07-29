// Web ↔ native HealthKit bridge. Everything is lazy and guarded so the web/PWA
// build (and the headless smoke test) never touch Capacitor at import time and
// never call a plugin method off-device.
import { mergeHealthImport } from "./healthMerge.js";
import { STRENGTH_DAYS } from "./exercises.js";

let _core = null;
let _plugin = null;

async function core() {
  if (!_core) _core = await import("@capacitor/core");
  return _core;
}

async function plugin() {
  if (!_plugin) {
    const { registerPlugin } = await core();
    _plugin = registerPlugin("Health");
  }
  return _plugin;
}

export async function isNativeIOS() {
  try {
    const { Capacitor } = await core();
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

// True only on a device where HealthKit exists (false on web and iPad-less sims).
export async function healthAvailable() {
  if (!(await isNativeIOS())) return false;
  try {
    const r = await (await plugin()).isAvailable();
    return !!r.available;
  } catch {
    return false;
  }
}

// Presents the system Health permission sheet. Resolves to whether the user
// completed the sheet (HealthKit never reveals which read types were granted).
export async function requestHealthAuthorization() {
  const r = await (await plugin()).requestAuthorization();
  return !!r.granted;
}

async function queryHealth(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const r = await (await plugin()).query({ startISO: start.toISOString(), endISO: end.toISOString() });
  return (r && r.byDay) || {};
}

// Pull the last `days` of HealthKit data and merge it into the store. Manual
// entries always win (see healthMerge). Returns a small status object.
export async function syncHealth(update, days = 45) {
  const byDay = await queryHealth(days);
  update((d) => {
    // Resolve a strength workout to that date's planned split, else the first.
    const resolveStrengthId = (key) =>
      STRENGTH_DAYS.includes(d.schedule?.[key]) ? d.schedule[key] : STRENGTH_DAYS[0];
    const merged = mergeHealthImport(d, byDay, resolveStrengthId);
    return { ...merged, health: { ...(merged.health || {}), connected: true, lastSync: Date.now() } };
  });
  return { importedDays: Object.keys(byDay).length, at: Date.now() };
}

export async function connectHealth(update) {
  const granted = await requestHealthAuthorization();
  if (!granted) {
    update((d) => ({ ...d, health: { ...(d.health || {}), connected: false } }));
    return { granted: false };
  }
  const res = await syncHealth(update);
  return { granted: true, ...res };
}

export function disconnectHealth(update) {
  update((d) => ({ ...d, health: { ...(d.health || {}), connected: false } }));
}
