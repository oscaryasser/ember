import { sanitizeDecimal } from "../lib/util.js";

export const Card = ({ children, style, className = "", onClick }) => (
  <div className={`card ${className}`} style={style} onClick={onClick}>{children}</div>
);

export const SectionLabel = ({ children, color }) => (
  <div className="section-label" style={color ? { color } : undefined}>{children}</div>
);

export const Field = ({ label, unit, value, onChange, color, inputMode = "decimal", placeholder = "—" }) => (
  <div style={{ flex: "1 1 44%", minWidth: 130 }}>
    <div className="field-label" style={color ? { color } : undefined}>
      {label} {unit && <span className="unit">{unit}</span>}
    </div>
    <input
      inputMode={inputMode}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(sanitizeDecimal(e.target.value))}
    />
  </div>
);

export const Chip = ({ active, color, children, onClick }) => (
  <button
    className="chip"
    onClick={onClick}
    aria-pressed={!!active}
    style={active ? { borderColor: color, background: `color-mix(in srgb, ${color} 13%, transparent)`, color } : undefined}
  >
    {children}
  </button>
);

export const Check = ({ on }) => (
  <div
    style={{
      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
      border: `1.5px solid ${on ? "var(--good)" : "var(--line)"}`,
      background: on ? "var(--good)" : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--on-accent)", fontSize: 13, fontWeight: 800,
    }}
  >
    {on ? "✓" : ""}
  </div>
);

// Dashboard stat tile: big number, dim caption, optional sparkline below.
export const StatTile = ({ value, valueColor = "var(--text)", sub, size = 32, spark }) => (
  <Card style={{ flex: "1 1 45%", minWidth: 140, textAlign: spark ? "left" : "center" }}>
    <div className="display" style={{ fontSize: size, fontWeight: 700, color: valueColor }}>{value}</div>
    <div style={{ fontSize: spark ? 12 : 13, color: "var(--dim)", marginBottom: spark ? 6 : 0 }}>{sub}</div>
    {spark}
  </Card>
);

export const Seg = ({ options, value, onChange, activeColor = "var(--ember)" }) => (
  <div style={{ display: "flex", background: "var(--card2)", borderRadius: 10, padding: 3 }}>
    {options.map(([v, label]) => (
      <button
        key={v}
        onClick={() => onChange(v)}
        style={{
          padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700,
          color: value === v ? "var(--on-accent)" : "var(--dim)",
          background: value === v ? activeColor : "transparent",
        }}
      >
        {label}
      </button>
    ))}
  </div>
);
