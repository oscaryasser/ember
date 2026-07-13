import React from "react";
import { kvGet } from "./lib/idb.js";
import { STORAGE_KEY } from "./store.jsx";

// Last line of defense: if a render throws, the user gets their data out,
// not a white screen. Reads storage directly — React state may be the thing
// that's broken.
export default class CrashGuard extends React.Component {
  state = { err: null, exported: false };

  static getDerivedStateFromError(err) {
    return { err };
  }

  exportRaw = async () => {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* try mirror */ }
    if (!raw) {
      try { raw = await kvGet(STORAGE_KEY); } catch { /* nothing readable */ }
    }
    if (!raw) {
      alert("No saved data found in either store.");
      return;
    }
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ember-rescue-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    this.setState({ exported: true });
  };

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="shell" style={{ paddingTop: 60, textAlign: "center" }}>
        <div style={{ fontSize: 44 }}>🧯</div>
        <div className="display" style={{ fontSize: 24, fontWeight: 700, margin: "10px 0 6px" }}>
          Ember hit an error
        </div>
        <div style={{ fontSize: 14, color: "var(--dim)", lineHeight: 1.5, marginBottom: 18 }}>
          Your log is safe in on-device storage. Grab a backup first, then reload —
          if it keeps happening, import the backup after clearing the app's website data.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
          <button className="btn primary" style={{ padding: "14px 0", fontWeight: 800 }} onClick={this.exportRaw}>
            {this.state.exported ? "✓ Backup downloaded" : "⬇ Download backup"}
          </button>
          <button className="btn" style={{ padding: "14px 0" }} onClick={() => location.reload()}>
            Reload the app
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 22, fontFamily: "ui-monospace, monospace", overflowWrap: "anywhere" }}>
          {String(this.state.err?.message || this.state.err)}
        </div>
      </div>
    );
  }
}
