import { useMemo, useState } from "react";
import { Card, SectionLabel } from "../components/ui.jsx";
import { num } from "../lib/util.js";
import { keyOffset } from "../lib/dates.js";
import { LineChart, Sparkline } from "../components/charts.jsx";
import { GRIPS, GRIP_ORDER, testHistory, pullupVolume, pullupDayKeys } from "../lib/pullups.js";

// Max-test trend per grip + daily-volume sparkline for the GtG program.
export default function PullupProgress({ data, goals }) {
  const allTests = useMemo(() => testHistory(data), [data]);
  const dayKeys = useMemo(() => pullupDayKeys(data), [data]);

  const defaultGrip = useMemo(() => {
    if (!allTests.length) return "chin";
    const counts = {};
    allTests.forEach((t) => (counts[t.grip] = (counts[t.grip] || 0) + 1));
    return GRIP_ORDER.reduce((a, b) => ((counts[b] || 0) > (counts[a] || 0) ? b : a), "chin");
  }, [allTests]);
  const [sel, setSel] = useState(null);
  const grip = sel || defaultGrip;

  const pts = useMemo(
    () => testHistory(data, grip).map((t) => ({ k: t.k, v: t.reps })),
    [data, grip]
  );
  const target = num(goals.pullupTarget);

  const bests = GRIP_ORDER.map((g) => {
    const h = testHistory(data, g);
    return { g, best: h.length ? Math.max(...h.map((t) => t.reps)) : null };
  });

  const vol14 = Array.from({ length: 14 }, (_, i) => {
    const v = pullupVolume(data.days[keyOffset(i - 13)]);
    return v > 0 ? v : null;
  });
  const totalReps = dayKeys.reduce((a, k) => a + pullupVolume(data.days[k]), 0);

  if (!allTests.length && !dayKeys.length) {
    return (
      <Card style={{ marginTop: 12 }}>
        <SectionLabel>Pull-ups · max tests</SectionLabel>
        <div style={{ fontSize: 13, color: "var(--dim)" }}>
          Log your first max test in the pull-up card on Today. Each grip charts here against your {target || 10}-rep target.
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ marginTop: 12 }}>
      <SectionLabel>Pull-ups · max tests</SectionLabel>

      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {bests.map(({ g, best }) => (
          <button key={g} onClick={() => setSel(g)}
            style={{
              flexShrink: 0, padding: "7px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: grip === g ? "color-mix(in srgb, var(--ember) 15%, transparent)" : "var(--card2)",
              border: `1px solid ${grip === g ? "var(--ember)" : "var(--line)"}`,
              color: grip === g ? "var(--ember)" : "var(--dim)",
            }}>
            {GRIPS[g].short}{best !== null ? ` · ${best}` : ""}
          </button>
        ))}
      </div>

      {pts.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--dim)" }}>No {GRIPS[grip].short.toLowerCase()} test yet — grips you haven't tested prescribe off your latest test on any grip.</div>
      ) : pts.length === 1 ? (
        <div style={{ fontSize: 13, color: "var(--dim)" }}>
          First {GRIPS[grip].short.toLowerCase()} test: <b style={{ color: "var(--text)" }}>{pts[0].v} reps</b>. The trend starts at test two — retest every ~10 days.
        </div>
      ) : (
        <LineChart pts={pts} target={target} color="var(--c-ember)" height={110} yFmt={(v) => Math.round(v)} unit=" reps" />
      )}

      {dayKeys.length > 0 && (
        <div className="row" style={{ gap: 12, marginTop: 10, alignItems: "center" }}>
          <div style={{ flex: "0 0 auto" }}>
            <div className="display" style={{ fontSize: 24, fontWeight: 700 }}>{totalReps.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "var(--dim)" }}>total reps · {dayKeys.length} days</div>
          </div>
          <div className="grow">
            <Sparkline pts={vol14} color="var(--c-fuel)" />
            <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "right" }}>daily volume · last 14d</div>
          </div>
        </div>
      )}
    </Card>
  );
}
