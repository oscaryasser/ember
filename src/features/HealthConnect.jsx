import { useEffect, useState } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { healthAvailable, connectHealth, syncHealth, disconnectHealth } from "../lib/health.js";

// Apple Health connect/disconnect control. Renders ONLY on a native iOS device
// where HealthKit exists — on the web/PWA it returns null, so the web app looks
// and behaves exactly as before.
export default function HealthConnect({ data, update }) {
  const [available, setAvailable] = useState(null); // null = still checking
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const health = data.health || {};
  const connected = !!health.connected;

  useEffect(() => {
    let alive = true;
    healthAvailable().then((ok) => alive && setAvailable(ok));
    return () => { alive = false; };
  }, []);

  // Auto-refresh once per app open when already connected.
  useEffect(() => {
    if (available && connected) {
      syncHealth(update).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  if (available !== true) return null; // web / non-iOS / HealthKit unavailable

  const run = async (fn, okMsg) => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await fn();
      if (r && r.granted === false) setErr("Health access wasn't granted. You can enable it in Settings › Privacy › Health › Ember.");
      else setMsg(okMsg(r));
    } catch (e) {
      setErr(e?.message || "Couldn't reach Apple Health.");
    } finally {
      setBusy(false);
    }
  };

  const lastSync = health.lastSync
    ? new Date(health.lastSync).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <Card style={{ marginTop: 12 }}>
      <SectionLabel color="var(--good)">Apple Health</SectionLabel>
      <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 10 }}>
        Auto-fills weight, steps, sleep, active energy, and workouts from Health. Reads only —
        nothing is written back, and your data never leaves this phone. Anything you type by hand always wins.
      </div>

      {!connected ? (
        <button
          className="btn primary grow row"
          style={{ justifyContent: "center", gap: 6, width: "100%" }}
          disabled={busy}
          onClick={() => run(() => connectHealth(update), (r) => `Connected — imported ${r.importedDays ?? 0} day${r.importedDays === 1 ? "" : "s"}.`)}
        >
          {busy ? "Connecting…" : "Connect Apple Health"}
        </button>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--good)", marginBottom: 10 }}>
            <span>● Connected</span>
            {lastSync && <span style={{ color: "var(--dim)", fontWeight: 500 }}>· last sync {lastSync}</span>}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn primary grow"
              disabled={busy}
              onClick={() => run(() => syncHealth(update), (r) => `Synced ${r.importedDays ?? 0} day${r.importedDays === 1 ? "" : "s"}.`)}
            >
              {busy ? "Syncing…" : "Sync now"}
            </button>
            <button
              className="btn grow"
              disabled={busy}
              onClick={() => { disconnectHealth(update); setMsg("Disconnected. Your imported data stays; Ember just stops reading Health."); setErr(null); }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}

      {msg && <div style={{ marginTop: 10, fontSize: 13, color: "var(--good)", fontWeight: 600 }}>{msg}</div>}
      {err && <div style={{ marginTop: 10, fontSize: 13, color: "var(--bad)", fontWeight: 600 }}>{err}</div>}
    </Card>
  );
}
