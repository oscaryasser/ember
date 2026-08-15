// Web ↔ native HealthKit bridge.
//
// Native detection uses the `window.Capacitor` global that the native WebView
// injects before our JS runs. On the web that global is absent, so isNativeIOS()
// is false and nothing below ever runs — HealthConnect renders null and the PWA
// behaves exactly as before.
//
// @capacitor/core is imported STATICALLY. A dynamic import() creates a lazy
// chunk, and loading that chunk inside Capacitor's WKWebView hangs (the connect
// call never reaches native, so the button sticks on "Connecting…"). A static
// import puts registerPlugin in the main bundle, which loads reliably. On the
// web the module is a harmless no-op (getPlatform() === "web").
import { registerPlugin } from "@capacitor/core";
import { mergeHealthImport } from "./healthMerge.js";
import { STRENGTH_DAYS } from "./exercises.js";

const Health = registerPlugin("Health");

function capGlobal() {
  return (typeof globalThis !== "undefined" && globalThis.Capacitor) || null;
}

export async function isNativeIOS() {
  const C = capGlobal();
  try {
    return !!(C && C.isNativePlatform?.() && C.getPlatform?.() === "ios");
  } catch {
    return false;
  }
}

// Never let a wedged native call hang the UI forever (App Review 2.1a: the
// Connect button "stayed greyed out"). Any bridge call that doesn't answer in
// time rejects, so the button always recovers instead of sticking.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

// Show the Health control on any native iOS build. Actual HealthKit
// availability + authorization is resolved when the user taps Connect
// (requestAuthorization resolves granted:false if HealthKit is unavailable),
// so a flaky isAvailable() round-trip can't hide the control on device.
export async function healthAvailable() {
  return isNativeIOS();
}

// Presents the system Health permission sheet. Resolves to whether the user
// completed the sheet (HealthKit never reveals which read types were granted).
export async function requestHealthAuthorization() {
  // No timeout here: this presents the system Health permission sheet, which
  // legitimately stays open until the user responds. A timeout would fire a
  // false error mid-sheet. The button shows "Connecting…" behind the sheet and
  // resolves the moment the user answers.
  const r = await Health.requestAuthorization();
  return !!r.granted;
}

async function queryHealth(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const r = await withTimeout(
    Health.query({ startISO: start.toISOString(), endISO: end.toISOString() }),
    30000, "Health query"
  );
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
  // Flip to connected the moment the permission sheet completes, then pull data
  // in the background — a slow/empty query must never keep the button spinning.
  update((d) => ({ ...d, health: { ...(d.health || {}), connected: true } }));
  syncHealth(update).catch(() => {});
  return { granted: true };
}

export function disconnectHealth(update) {
  update((d) => ({ ...d, health: { ...(d.health || {}), connected: false } }));
}
