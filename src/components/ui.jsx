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
    style={active ? { borderColor: color, background: color + "22", color } : undefined}
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
