import { useEffect, useState } from "react";
import { useStore } from "./store.jsx";
import { RestTimerProvider } from "./features/RestTimer.jsx";
import QuickLog from "./features/QuickLog.jsx";
import { logStreak } from "./lib/coach.js";
import Today from "./tabs/Today.jsx";
import Plan from "./tabs/Plan.jsx";
import Coach from "./tabs/Coach.jsx";
import Progress from "./tabs/Progress.jsx";
import Goals from "./tabs/Goals.jsx";

const ICONS = {
  today: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><circle cx="12" cy="15.5" r="1.5" fill="currentColor" stroke="none" /></svg>,
  plan: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6l1 3h4v13H4V7h4z" /><path d="M9 4a3 3 0 0 1 6 0" /><path d="M9 13l2 2 4-4" /></svg>,
  coach: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c1 3-3 4.5-3 8a3 3 0 0 0 6 0c0-1.2-.5-2.2-1-3" /><path d="M12 3c4 3.5 6 6.5 6 10a6 6 0 0 1-12 0c0-2 .8-3.8 2-5.5" /></svg>,
  progress: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="20" y2="20" /><polyline points="4 15 9 10 13 13 20 5" /><polyline points="15 5 20 5 20 10" /></svg>,
  goals: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></svg>,
};

const TABS = [
  ["today", "Today"],
  ["plan", "Plan"],
  ["coach", "Coach"],
  ["progress", "Progress"],
  ["goals", "Goals"],
];

export default function App() {
  const { data, update, saveState, lastSaved, loaded } = useStore();
  const [tab, setTab] = useState("today");

  useEffect(() => {
    if (data) document.documentElement.setAttribute("data-theme", data.theme);
  }, [data?.theme]);

  if (!loaded) {
    return (
      <div className="shell" style={{ textAlign: "center", color: "var(--dim)", paddingTop: 120 }}>
        Loading your log…
      </div>
    );
  }

  const streak = logStreak(data);

  return (
    <RestTimerProvider defaultSecs={data.goals.restSecs || 90}>
      <div className="shell">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div className="display" style={{ fontSize: 26, fontWeight: 700 }}>
              EMBER<span style={{ color: "var(--ember)" }}>.</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)" }}>
              {data.goals.weeklyRuns} runs + {data.goals.weeklyStrength} lifts a week · −{data.goals.deficit} kcal/day · {data.goals.protein}g+ protein
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {streak > 1 && (
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ember)" }}>🔥{streak}</div>
            )}
            <div style={{ fontSize: 11, color: saveState === "error" ? "var(--bad)" : "var(--dim)", minWidth: 52, textAlign: "right" }}>
              {saveState === "saving" ? "saving…" : saveState === "saved" ? "✓ saved" : saveState === "error" ? "save failed" : ""}
            </div>
          </div>
        </div>

        {tab === "today" && <Today data={data} update={update} goTo={setTab} />}
        {tab === "plan" && <Plan data={data} update={update} />}
        {tab === "coach" && <Coach data={data} />}
        {tab === "progress" && <Progress data={data} update={update} />}
        {tab === "goals" && <Goals data={data} update={update} saveState={saveState} lastSaved={lastSaved} />}
      </div>

      <QuickLog data={data} update={update} />

      <nav className="nav">
        <div className="nav-inner">
          {TABS.map(([id, label]) => (
            <button key={id} className={`nav-item ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
              {ICONS[id]}
              {label}
            </button>
          ))}
        </div>
      </nav>
    </RestTimerProvider>
  );
}
