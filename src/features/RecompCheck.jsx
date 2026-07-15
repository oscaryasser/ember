import { useMemo } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { recompCheck } from "../lib/recomp.js";

const TONE = { good: "var(--good)", warn: "var(--ember)", bad: "var(--bad)", dim: "var(--dim)" };

// Is it fat that's leaving, not muscle? Waist × weight × strength, crossed.
export default function RecompCheck({ data }) {
  const rc = useMemo(() => recompCheck(data), [data]);

  if (!rc.ready) {
    return (
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel color="var(--good)">Recomp check · fat vs muscle</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>
          The scale can't tell fat loss from muscle loss — waist + weight + strength together can.
          <br /><b style={{ color: "var(--text)" }}>Still needed:</b> {rc.missing.join(" · ")}.
        </div>
      </Card>
    );
  }

  const color = TONE[rc.tone];
  return (
    <Card style={{ marginBottom: 12, borderColor: `color-mix(in srgb, ${color} 40%, var(--line))` }}>
      <SectionLabel color={color}>Recomp check · fat vs muscle</SectionLabel>
      <div style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1.4 }}>{rc.headline}</div>
      <div style={{ fontSize: 13, color: "var(--text)", margin: "6px 0 10px", lineHeight: 1.5 }}>{rc.advice}</div>
      {rc.lines.map((l, i) => (
        <div key={i} className="row" style={{ gap: 8, alignItems: "baseline", padding: "3px 0", fontSize: 13 }}>
          <span style={{ color: l.ok ? "var(--good)" : "var(--dim)", fontWeight: 800, width: 14, flexShrink: 0 }}>{l.ok ? "✓" : "○"}</span>
          <span style={{ color: l.ok ? "var(--text)" : "var(--dim)" }}>{l.txt}</span>
        </div>
      ))}
    </Card>
  );
}
