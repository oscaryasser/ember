// Headless end-to-end smoke test. Boots the REAL built bundle (dist/) in
// happy-dom with a fake IndexedDB, then proves the two scenarios that matter
// most:
//   1. Rescue: localStorage is CORRUPT, the IndexedDB mirror is good — the
//      app must boot with the mirror's data, not empty.
//   2. Every tab renders without tripping the CrashGuard.
// Run AFTER `vite build`:  npm run smoke
import { Window } from "happy-dom";
import "fake-indexeddb/auto";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "dist/assets");
const bundle = readdirSync(assets).find((f) => /^index-.*\.js$/.test(f));
if (!bundle) {
  console.error("smoke: no dist bundle — run `vite build` first");
  process.exit(1);
}

console.error("ck1: deps loaded");
const win = new Window({ url: "https://smoke.local/ember/" });
win.document.body.innerHTML = '<div id="root"></div>';

// Expose the DOM to the bundle. Node ships its own read-only-ish globals for
// some of these, so defineProperty instead of assignment.
const expose = (name, value) => {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  } catch { /* keep node's own if truly locked */ }
};
expose("window", win);
expose("document", win.document);
expose("navigator", win.navigator);
expose("localStorage", win.localStorage);
expose("location", win.location);
expose("history", win.history);
for (const k of ["HTMLElement", "Element", "Node", "CustomEvent", "Event", "MouseEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "matchMedia"]) {
  if (win[k] !== undefined && globalThis[k] === undefined) expose(k, typeof win[k] === "function" && !/^[A-Z]/.test(k) ? win[k].bind(win) : win[k]);
}
// happy-dom's window has indexedDB undefined; route it (and the app's view of
// it) to fake-indexeddb, which `fake-indexeddb/auto` put on globalThis.
expose("indexedDB", globalThis.indexedDB);
win.indexedDB = globalThis.indexedDB;
// No real SW here — make registerSW take its "unsupported" path instead of
// attempting a network fetch of sw.js.
try { Object.defineProperty(win.navigator, "serviceWorker", { value: undefined, configurable: true }); } catch { /* fine */ }
// Surface stray async errors without letting them mask assertion results.
process.on("unhandledRejection", (e) => console.error("  (non-fatal unhandled rejection):", e?.message || e));

console.error("ck2: dom exposed");
const KEY = "ember:data:v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toLocaleDateString("en-CA");
const yest = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString("en-CA"); })();

// --- Scenario 1 setup: corrupt localStorage, healthy mirror ---
const goodData = {
  version: 1, theme: "dark", runWeek: 4, runAck: {}, custom: {},
  goals: { protein: 172, deficit: 500, steps: 8000, sleepHours: 7, targetWeight: "185", weeklyRuns: 2, weeklyStrength: 2, maxLossPct: 1.5, restSecs: 90, pullupDays: 5, pullupTarget: 10 },
  days: {
    [yest]: { activities: ["run"], checks: { run: true }, weight: "211.5", calIn: "1900", calActive: "420", calResting: "1750", proteinEntries: [40, 40, 40, 40], runWeek: 4 },
    [today]: { activities: [], checks: {}, weight: "210.5" },
  },
  savedAt: Date.now(),
};
localStorage.setItem(KEY, '{"days":{"2026-07-0'); // truncated write — corrupt
const { kvSet } = await import(join(root, "src/lib/idb.js"));
await kvSet(KEY, JSON.stringify(goodData));

// --- Boot the real bundle ---
console.error("ck3: mirror seeded");
await import(join(assets, bundle));
console.error("ck4: bundle imported");
await sleep(400);

const text = () => win.document.body.textContent.replace(/\s+/g, " ");
const crashed = () => text().includes("Ember hit an error");

assert.ok(!text().includes("Loading your log"), "app finished loading");
assert.ok(!crashed(), "no CrashGuard on boot");
assert.ok(text().includes("210.5 lbs"), "RESCUE: mirror data rendered despite corrupt localStorage");
assert.ok(text().includes("172g+ protein"), "RESCUE: goals came from the mirror");
console.log("  ✓ corrupt localStorage + good mirror → boots with the mirror's data");

// --- Scenario 2: walk every tab ---
const clickByText = async (t) => {
  const btns = [...win.document.querySelectorAll("button")];
  const b = btns.find((x) => x.textContent.trim() === t || x.textContent.includes(t));
  assert.ok(b, `button "${t}" exists`);
  b.dispatchEvent(new win.Event("click", { bubbles: true, cancelable: true }));
  await sleep(150);
};

const TABS = [
  ["Plan", "grease the groove"],
  ["Coach", "coach's verdict"],
  ["Progress", "Progress photos"],
  ["Goals", "Backup & restore"],
  ["Today", "What did you train?"],
];
for (const [tab, marker] of TABS) {
  await clickByText(tab);
  assert.ok(!crashed(), `no CrashGuard on ${tab}`);
  assert.ok(text().toLowerCase().includes(marker.toLowerCase()), `${tab} renders (“${marker}”)`);
  console.log(`  ✓ ${tab} tab renders`);
}

// Coach must be judging against the mirror's edited goal, not a default.
await clickByText("Coach");
assert.ok(text().includes("goal 172+"), "verdict uses the imported protein goal");
console.log("  ✓ coach verdict judges against the rescued goals");

console.log("\nsmoke: all scenarios passed");
process.exit(0);
