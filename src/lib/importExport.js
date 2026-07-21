import { todayKey } from "./dates.js";
import { hasAnyLog, sanitizeDay } from "./util.js";

// Accepts every plausible export shape from the old artifact or from Ember:
//   1. Raw data object:                  { days: {...}, runWeek, custom, ... }
//   2. Ember export:                     { app: "ember", version, data: {...} }
//   3. KV pair:                          { key: "recomp:data", value: <obj or JSON string> }
//   4. Keyed map:                        { "recomp:data": <obj or JSON string> }
//   5. Double-encoded JSON string of any of the above.
export function normalizeImport(text) {
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error("That isn't valid JSON. Paste or pick the backup file exactly as exported.");
  }
  for (let depth = 0; typeof j === "string" && depth < 3; depth++) {
    try { j = JSON.parse(j); } catch { break; }
  }
  if (j && typeof j === "object") {
    if (j.data && typeof j.data === "object" && j.data.days) j = j.data;
    else if (j["recomp:data"] !== undefined) j = unwrap(j["recomp:data"]);
    else if (j.key === "recomp:data" && j.value !== undefined) j = unwrap(j.value);
    else if (!j.days && j.value !== undefined) j = unwrap(j.value);
  }
  if (!j || typeof j !== "object" || !j.days || typeof j.days !== "object") {
    throw new Error("No day log found in this backup. Expected a `days` object (the recomp:data shape).");
  }
  return j;
}

function unwrap(v) {
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
}

export function summarizeImport(imported) {
  const keys = Object.keys(imported.days).filter((k) => hasAnyLog(imported.days[k])).sort();
  return {
    dayCount: keys.length,
    first: keys[0] || null,
    last: keys[keys.length - 1] || null,
    runWeek: imported.runWeek || null,
    hasGoals: !!imported.goals,
  };
}

// Imported data wins per-day; settings come along when present. Every
// imported day is sanitized — one malformed record must never brick a render.
export function mergeImport(current, imported) {
  const cleanDays = {};
  for (const [k, v] of Object.entries(imported.days)) {
    const clean = sanitizeDay(v);
    if (clean) cleanDays[k] = clean;
  }
  const merged = {
    ...current,
    days: { ...current.days, ...cleanDays },
  };
  if (imported.runWeek) merged.runWeek = imported.runWeek;
  if (imported.runAck) merged.runAck = { ...current.runAck, ...imported.runAck };
  if (imported.custom) merged.custom = mergeCustom(current.custom, imported.custom);
  if (Array.isArray(imported.foods)) {
    const byId = new Map((current.foods || []).map((f) => [f.id, f]));
    for (const f of imported.foods) {
      if (f && typeof f === "object" && typeof f.name === "string") byId.set(f.id ?? f.name, f);
    }
    merged.foods = [...byId.values()];
  }
  if (imported.schedule && typeof imported.schedule === "object") merged.schedule = { ...current.schedule, ...imported.schedule };
  if (imported.goals) merged.goals = { ...current.goals, ...imported.goals };
  if (imported.targetWeight && !imported.goals) {
    merged.goals = { ...merged.goals, targetWeight: imported.targetWeight };
  }
  return merged;
}

function mergeCustom(a = {}, b = {}) {
  const out = {};
  for (const id of ["A", "B"]) {
    out[id] = {};
    for (const mode of ["home", "gym"]) {
      const cur = (a[id] || {})[mode] || [];
      const inc = (b[id] || {})[mode] || [];
      out[id][mode] = [...cur, ...inc.filter((x) => !cur.includes(x))];
    }
  }
  return out;
}

export function buildExport(data) {
  return JSON.stringify(
    { app: "ember", version: 1, exportedAt: new Date().toISOString(), data },
    null,
    2
  );
}

export function downloadExport(data) {
  const blob = new Blob([buildExport(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ember-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
