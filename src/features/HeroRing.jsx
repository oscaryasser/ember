import { useEffect, useMemo, useRef, useState } from "react";
import { num, intakeOf, proteinOf } from "../lib/util.js";
import { resolveTargets } from "../lib/adaptive.js";

// Animate a number toward its target over ~400ms — the ring counts instead of snapping.
function useCountUp(target) {
  const [shown, setShown] = useState(target);
  const raf = useRef(0);
  useEffect(() => {
    const from = shown, to = target;
    if (from === to || from === null || to === null) { setShown(to); return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 400);
      setShown(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}

// The day as a budget: outer ring = calories spent vs target, inner arc =
// protein progress, center = what's left to eat. Falls back gracefully when
// no target exists yet (shows what's logged instead).
export default function HeroRing({ data, day }) {
  const targets = useMemo(() => resolveTargets(data), [data]);
  const intake = intakeOf(day) || 0;
  const prot = proteinOf(day);
  const protGoal = targets.protein || num(data.goals.protein);

  const R1 = 52, R2 = 40, CX = 60, CY = 60, SW = 9;
  const C1 = 2 * Math.PI * R1, C2 = 2 * Math.PI * R2;
  const kcalPct = targets.kcal ? Math.min(1, intake / targets.kcal) : 0;
  const protPct = protGoal ? Math.min(1, prot / protGoal) : 0;
  const over = targets.kcal !== null && intake > targets.kcal;
  const left = targets.kcal !== null ? targets.kcal - intake : null;
  const centerShown = useCountUp(left !== null ? Math.abs(Math.round(left)) : intake || 0);

  return (
    <div className="row" style={{ gap: 6, alignItems: "center" }}>
      <svg viewBox="0 0 120 120" style={{ width: 108, height: 108, flexShrink: 0 }} role="img"
        aria-label={left !== null ? `${Math.abs(left)} calories ${left >= 0 ? "left" : "over"}` : "calories logged"}>
        <circle cx={CX} cy={CY} r={R1} fill="none" stroke="var(--card2)" strokeWidth={SW} />
        <circle cx={CX} cy={CY} r={R2} fill="none" stroke="var(--card2)" strokeWidth={SW - 2} />
        {targets.kcal !== null && (
          <circle cx={CX} cy={CY} r={R1} fill="none"
            stroke={over ? "var(--c-bad)" : "var(--c-fuel)"} strokeWidth={SW} strokeLinecap="round"
            strokeDasharray={`${C1 * kcalPct} ${C1}`} transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: "stroke-dasharray 0.4s" }} />
        )}
        {protGoal && (
          <circle cx={CX} cy={CY} r={R2} fill="none"
            stroke="var(--c-good)" strokeWidth={SW - 2} strokeLinecap="round"
            strokeDasharray={`${C2 * protPct} ${C2}`} transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: "stroke-dasharray 0.4s" }} />
        )}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" fontWeight="700"
          fill={over ? "var(--c-bad)" : "var(--c-text, currentColor)"} className="display"
          style={{ fontVariantNumeric: "tabular-nums" }}>
          {left !== null || intake ? (centerShown ?? 0).toLocaleString() : "—"}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="8.5" fill="var(--dim)" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {left !== null ? (over ? "kcal over" : "kcal left") : "kcal logged"}
        </text>
        <text x={CX} y={CY + 24} textAnchor="middle" fontSize="8" fill="var(--c-good)" fontWeight="700">
          {protGoal ? `P ${Math.round(prot)}/${Math.round(protGoal)}` : ""}
        </text>
      </svg>
    </div>
  );
}
