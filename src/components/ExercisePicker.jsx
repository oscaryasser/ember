import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";
import { MUSCLE_GROUPS, EXERCISE_DB, searchExercises } from "../lib/exerciseDB.js";
import { lastSetsFor } from "../lib/strength.js";

// Bottom-sheet exercise picker: search or browse by muscle, see your last
// session on each (so you know it'll carry), or type your own. onPick gets a
// "Name — scheme" string. `muscle` pre-filters (used by "more" swaps).
export default function ExercisePicker({ onPick, onClose, data, dateKey, muscle = null, title = "Add exercise" }) {
  const [q, setQ] = useState("");
  const query = q.trim();

  const lastFor = (name) => {
    const l = lastSetsFor(data, null, name, dateKey);
    if (!l) return null;
    return l.sets.map((s) => `${s.w ? s.w + "×" : ""}${s.r}`).slice(0, 3).join(", ");
  };

  const groups = useMemo(() => {
    if (query) {
      const hits = searchExercises(query);
      return hits.length ? [["Results", hits.map((e) => [e.name, e.scheme])]] : [];
    }
    const list = muscle ? [muscle] : MUSCLE_GROUPS;
    return list.map((m) => [m, EXERCISE_DB[m] || []]);
  }, [query, muscle]);

  const Row = ({ name, scheme }) => {
    const last = lastFor(name);
    return (
      <button className="row" style={{ width: "100%", textAlign: "left", padding: "9px 4px", borderTop: "1px solid var(--hair)", gap: 8 }}
        onClick={() => onPick(`${name} — ${scheme}`)}>
        <span className="grow">
          <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 12, color: "var(--dim)", display: "block" }}>
            {scheme}{last && <span style={{ color: "var(--good)", fontWeight: 700 }}> · last {last}</span>}
          </span>
        </span>
        <Icon name="plus" size={17} color="var(--fuel)" strokeWidth={2.2} />
      </button>
    );
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>{title}{muscle ? ` · ${muscle}` : ""}</div>
          <button className="btn ghost" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>

        <input className="body-font" autoFocus placeholder="Search exercises…" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ fontSize: 15, padding: "10px 12px", marginBottom: 8 }} />

        {groups.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--dim)", padding: "6px 0" }}>No match in the library — add it as your own below.</div>
        )}

        {groups.map(([g, items]) => (
          <div key={g} style={{ marginTop: 6 }}>
            {!query && <div className="section-label" style={{ marginBottom: 2 }}>{g}</div>}
            {items.map(([name, scheme]) => <Row key={name} name={name} scheme={scheme} />)}
          </div>
        ))}

        {query && (
          <button className="btn primary row" style={{ width: "100%", marginTop: 12, justifyContent: "center", gap: 6, fontWeight: 800 }}
            onClick={() => onPick(`${query} — 3 × 8–12`)}>
            <Icon name="plus" size={16} strokeWidth={2.2} /> Add “{query}” as my own
          </button>
        )}
      </div>
    </div>
  );
}
