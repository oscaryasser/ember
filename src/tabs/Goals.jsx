import { useRef, useState } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { DEFAULT_GOALS } from "../store.jsx";
import { sanitizeDecimal } from "../lib/util.js";
import { normalizeImport, summarizeImport, mergeImport, downloadExport, buildExport } from "../lib/importExport.js";
import { buildCoachBrief } from "../lib/brief.js";
import { kvSet } from "../lib/idb.js";
import { niceDate } from "../lib/dates.js";

const GOAL_FIELDS = [
  { id: "protein", label: "Protein goal", unit: "g/day", hint: "The verdict and today's protein bar judge against this." },
  { id: "deficit", label: "Daily deficit target", unit: "kcal/day", hint: "500/day ≈ 1 lb/week. The energy ledger and weekly verdict use it." },
  { id: "steps", label: "Step goal", unit: "steps/day", int: true },
  { id: "sleepHours", label: "Sleep target", unit: "h/night" },
  { id: "targetWeight", label: "Target weight", unit: "lbs" },
  { id: "weeklyRuns", label: "Runs per week", unit: "sessions", int: true },
  { id: "weeklyStrength", label: "Strength per week", unit: "sessions", int: true },
  { id: "maxLossPct", label: "Max healthy loss rate", unit: "% bodyweight/wk", hint: "Faster than this and the coach tells you to eat more." },
  { id: "restSecs", label: "Rest timer", unit: "seconds", int: true },
  { id: "pullupDays", label: "Pull-up days", unit: "days/week", int: true, hint: "The grease-the-groove program — 5–6 easy days beats 2 hard ones." },
  { id: "pullupTarget", label: "Pull-up target", unit: "strict reps", int: true, hint: "Goal line on the max-test chart." },
  { id: "calTarget", label: "Calorie target", unit: "kcal/day", blankAuto: true, hint: "Blank = adaptive: measured TDEE − deficit (see the Coach tab)." },
  { id: "fat", label: "Fat target", unit: "g/day", blankAuto: true, hint: "Blank = auto (30% of calories)." },
  { id: "carbs", label: "Carb target", unit: "g/day", blankAuto: true, hint: "Blank = auto (calories left after protein + fat)." },
];

export default function Goals({ data, update, saveState, lastSaved }) {
  const goals = data.goals;
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // { imported, summary }
  const [importErr, setImportErr] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);

  const setGoal = (id, v) => update((d) => ({ ...d, goals: { ...d.goals, [id]: v } }));

  const commitGoal = (id, v, int, blankAuto) => {
    const n = parseFloat(v);
    if (id === "targetWeight" || blankAuto) return; // blank is a valid value (auto/unset)
    if (isNaN(n) || n <= 0) setGoal(id, DEFAULT_GOALS[id]);
    else setGoal(id, int ? Math.round(n) : n);
  };

  const stageImport = (text) => {
    setImportErr(null);
    try {
      const imported = normalizeImport(text);
      setPending({ imported, summary: summarizeImport(imported) });
    } catch (e) {
      setPending(null);
      setImportErr(e.message);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => stageImport(reader.result);
    reader.onerror = () => setImportErr("Couldn't read that file.");
    reader.readAsText(f);
  };

  const applyImport = () => {
    // Safety snapshot of the current log before merging, kept in IndexedDB.
    kvSet("ember:pre-import-snapshot", buildExport(data)).catch(() => {});
    update((d) => mergeImport(d, pending.imported));
    setPending(null);
    setPasteText("");
    setPasteOpen(false);
  };

  const dayCount = Object.keys(data.days).length;

  return (
    <div className="fade-in">
      <Card>
        <SectionLabel color="var(--ember)">Goals — what the coach judges you against</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {GOAL_FIELDS.map((f) => (
            <div key={f.id} style={{ flex: "1 1 44%", minWidth: 140 }}>
              <div className="field-label">{f.label} <span className="unit">{f.unit}</span></div>
              <input
                inputMode="decimal"
                placeholder={f.id === "targetWeight" ? "not set" : f.blankAuto ? "auto" : String(DEFAULT_GOALS[f.id])}
                value={goals[f.id] ?? ""}
                onChange={(e) => setGoal(f.id, sanitizeDecimal(e.target.value))}
                onBlur={(e) => commitGoal(f.id, e.target.value, f.int, f.blankAuto)}
              />
              {f.hint && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>{f.hint}</div>}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12 }}>
          Changes apply everywhere immediately — today's bars, the energy ledger, the weekly verdict, the streaks.
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <SectionLabel color="var(--fuel)">Backup & restore</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 10 }}>
          {dayCount} day{dayCount === 1 ? "" : "s"} in the log. Everything lives on this phone — export a backup now and then.
          Photos stay in the phone's app storage and aren't part of the JSON file.
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn primary grow" onClick={() => downloadExport(data)}>⬇ Export backup (JSON)</button>
          <button className="btn grow" onClick={async () => {
            try {
              await navigator.clipboard.writeText(buildExport(data));
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch { alert("Clipboard blocked — use Export instead."); }
          }}>
            {copied ? "✓ Copied" : "Copy to clipboard"}
          </button>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button className="btn grow" onClick={() => fileRef.current?.click()}>⬆ Import backup file</button>
          <button className="btn grow" onClick={() => setPasteOpen((o) => !o)}>Paste backup JSON</button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json,text/plain" style={{ display: "none" }} onChange={onFile} />

        {pasteOpen && (
          <div style={{ marginTop: 10 }}>
            <textarea
              rows={5}
              placeholder='Paste the copied backup here (the old app’s "Copy backup" output works as-is)'
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }}
            />
            <button className="btn primary" style={{ width: "100%", marginTop: 8 }} disabled={!pasteText.trim()} onClick={() => stageImport(pasteText)}>
              Check backup
            </button>
          </div>
        )}

        {importErr && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--bad)", color: "var(--bad)", fontSize: 13, fontWeight: 600 }}>
            {importErr}
          </div>
        )}

        {pending && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid color-mix(in srgb, var(--good) 45%, var(--line))", background: "color-mix(in srgb, var(--good) 7%, transparent)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--good)", marginBottom: 6 }}>✓ Backup looks good</div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
              {pending.summary.dayCount} logged day{pending.summary.dayCount === 1 ? "" : "s"}
              {pending.summary.first && <> · {niceDate(pending.summary.first)} → {niceDate(pending.summary.last)}</>}
              {pending.summary.runWeek && <> · run plan week {pending.summary.runWeek}</>}
            </div>
            <div style={{ fontSize: 12, color: "var(--dim)", margin: "6px 0 10px" }}>
              Imported days win on conflicts; everything else merges. A snapshot of the current log is kept just in case.
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary grow" onClick={applyImport}>Import {pending.summary.dayCount} days</button>
              <button className="btn grow" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <SectionLabel color="var(--good)">AI coach brief</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 10 }}>
          Your last 4 weeks — TDEE, deficit, lifts, runs, pull-ups, sleep, verdicts — as one paste-ready
          block. Drop it into Claude whenever you want a second opinion on the plan.
        </div>
        <button className="btn primary" style={{ width: "100%", fontWeight: 800 }} onClick={async () => {
          try {
            await navigator.clipboard.writeText(buildCoachBrief(data));
            setBriefCopied(true);
            setTimeout(() => setBriefCopied(false), 2000);
          } catch { alert("Clipboard blocked — try again after tapping the page."); }
        }}>
          {briefCopied ? "✓ Copied — paste it to your AI of choice" : "📋 Copy AI coach brief"}
        </button>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <SectionLabel>App</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
          <b style={{ color: "var(--text)" }}>Ember</b> · your recomp, one controlled burn at a time.<br />
          Save status: {saveState === "error" ? <b style={{ color: "var(--bad)" }}>SAVE FAILED — export a backup now</b> : saveState === "saving" ? "saving…" : "all changes saved"}
          {lastSaved && <> · last write {lastSaved.toLocaleTimeString()}</>}<br />
          Data is written to two places on-device (localStorage + IndexedDB) on every change. Works fully offline once installed.
        </div>
        <button
          className="btn"
          style={{ marginTop: 10 }}
          onClick={() => update((d) => ({ ...d, theme: d.theme === "dark" ? "light" : "dark" }))}>
          {data.theme === "dark" ? "☀️ Switch to light theme" : "🌙 Switch to dark theme"}
        </button>
      </Card>
    </div>
  );
}
