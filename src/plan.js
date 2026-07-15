// The 10-week zero-to-30-minutes plan and the A/B strength templates.
// Protocols carried over verbatim from the original recomp-log artifact.

export const RUN_WEEKS = {
  1: { label: "Week 1", protocol: "8 × (1 min jog / 2 min walk)", detail: "5 min brisk walk warmup. Jog easy — you should be able to talk. ~29 min total.", jog: 8, cool: "5 min walk cooldown", intervals: { reps: 8, jog: 60, walk: 120 } },
  2: { label: "Week 2", protocol: "8 × (1 min jog / 2 min walk)", detail: "Same as week 1. Jogs should feel slightly easier by the end of the week.", jog: 8, cool: "5 min walk cooldown", intervals: { reps: 8, jog: 60, walk: 120 } },
  3: { label: "Week 3", protocol: "6 × (2 min jog / 2 min walk)", detail: "5 min warmup walk. Total jog time: 12 min.", jog: 12, cool: "5 min walk cooldown", intervals: { reps: 6, jog: 120, walk: 120 } },
  4: { label: "Week 4", protocol: "6 × (2 min jog / 2 min walk)", detail: "Repeat. If shins or knees complain, stay here another week.", jog: 12, cool: "5 min walk cooldown", intervals: { reps: 6, jog: 120, walk: 120 } },
  5: { label: "Week 5", protocol: "5 × (3 min jog / 90 sec walk)", detail: "5 min warmup. Total jog time: 15 min.", jog: 15, cool: "5 min walk cooldown", intervals: { reps: 5, jog: 180, walk: 90 } },
  6: { label: "Week 6", protocol: "5 × (3 min jog / 90 sec walk)", detail: "Repeat week 5. Keep the pace conversational.", jog: 15, cool: "5 min walk cooldown", intervals: { reps: 5, jog: 180, walk: 90 } },
  7: { label: "Week 7", protocol: "3 × (5 min jog / 2 min walk)", detail: "5 min warmup. Total jog time: 15 min in longer blocks.", jog: 15, cool: "5 min walk cooldown", intervals: { reps: 3, jog: 300, walk: 120 } },
  8: { label: "Week 8", protocol: "8 min jog / 5 min walk / 8 min jog", detail: "First long continuous blocks. Slow is fine — continuous is the goal.", jog: 16, cool: "5 min walk cooldown", blocks: [ { type: "jog", secs: 480 }, { type: "walk", secs: 300 }, { type: "jog", secs: 480 } ] },
  9: { label: "Week 9", protocol: "20–25 min continuous jog", detail: "First run: 20 min straight. Second run of the week: 25 min.", jog: 22, cool: "5 min walk cooldown", continuous: [20, 25] },
  10: { label: "Week 10", protocol: "30 min continuous jog", detail: "The goal run. Zero to 30 minutes non-stop. Repeat this week as your new baseline.", jog: 30, cool: "5 min walk cooldown", continuous: [30] },
};

export const WARMUP_SECS = 300;
export const COOLDOWN_SECS = 300;

// ⚠ Exercise history is keyed by the text BEFORE the "—" in each label below
// (see StrengthCard's exName). Renaming that part orphans every logged set
// for the exercise. Reword the rep scheme freely; don't touch the name part.

// Build the full guided-timer segment list for a run week.
// `variant` picks among `continuous` options (index), ignored otherwise.
export function buildRunSegments(week, variant = 0) {
  const w = RUN_WEEKS[week];
  if (!w) return [];
  const segs = [{ type: "warmup", label: "Warmup walk", secs: WARMUP_SECS }];
  if (w.intervals) {
    const { reps, jog, walk } = w.intervals;
    for (let i = 1; i <= reps; i++) {
      segs.push({ type: "jog", label: `Jog ${i}/${reps}`, secs: jog });
      if (i < reps) segs.push({ type: "walk", label: `Walk ${i}/${reps - 1}`, secs: walk });
    }
  } else if (w.blocks) {
    let j = 0;
    w.blocks.forEach((b) => {
      if (b.type === "jog") j++;
      segs.push({ type: b.type, label: b.type === "jog" ? `Jog block ${j}` : "Recovery walk", secs: b.secs });
    });
  } else if (w.continuous) {
    const mins = w.continuous[Math.min(variant, w.continuous.length - 1)];
    segs.push({ type: "jog", label: `${mins} min continuous jog`, secs: mins * 60 });
  }
  segs.push({ type: "cool", label: "Cooldown walk", secs: COOLDOWN_SECS });
  return segs;
}

// Life after Week 10: user-built interval sessions and free-duration runs,
// with the same warmup/cooldown bookends and guided cues as the plan weeks.
export function buildCustomSegments(cfg) {
  const segs = [{ type: "warmup", label: "Warmup walk", secs: WARMUP_SECS }];
  if (cfg.kind === "free") {
    const mins = Math.max(1, Math.round(cfg.mins || 30));
    segs.push({ type: "jog", label: `${mins} min run`, secs: mins * 60 });
  } else {
    const reps = Math.max(1, Math.round(cfg.reps || 5));
    const jog = Math.max(10, Math.round((cfg.jogMins || 3) * 60));
    const walk = Math.max(10, Math.round((cfg.walkMins || 1.5) * 60));
    for (let i = 1; i <= reps; i++) {
      segs.push({ type: "jog", label: `Run ${i}/${reps}`, secs: jog });
      if (i < reps) segs.push({ type: "walk", label: `Recover ${i}/${reps - 1}`, secs: walk });
    }
  }
  segs.push({ type: "cool", label: "Cooldown walk", secs: COOLDOWN_SECS });
  return segs;
}

export const totalSecs = (segs) => segs.reduce((a, s) => a + s.secs, 0);

export const STRENGTH = {
  A: {
    name: "Strength A · Push focus",
    home: [
      "Weight-vest squats — 3 × 8–12",
      "Weight-vest push-ups — 3 × 8–12",
      "Band-assisted pull-ups (or band rows) — 3 × 8–12",
      "Plank — 3 × 30–45 sec",
    ],
    gym: [
      "Leg press or goblet squat — 3 × 8–12",
      "Chest press machine / DB bench — 3 × 8–12",
      "Lat pulldown — 3 × 8–12",
      "Cable crunch — 3 × 12–15",
    ],
  },
  B: {
    name: "Strength B · Hinge & pull focus",
    home: [
      "Banded RDL or vest good-mornings — 3 × 8–12",
      "Pike push-ups or band overhead press — 3 × 8–12",
      "Band rows — 3 × 10–15",
      "Weight-vest lunges — 3 × 8–10 / leg",
    ],
    gym: [
      "Dumbbell Romanian deadlift — 3 × 8–12",
      "Shoulder press machine / DB press — 3 × 8–12",
      "Seated cable row — 3 × 8–12",
      "Walking lunges — 3 × 8–10 / leg",
    ],
  },
};

export const MEASUREMENT_FIELDS = [
  { id: "waist", label: "Waist" },
  { id: "chest", label: "Chest" },
  { id: "arms", label: "Arms" },
  { id: "hips", label: "Hips" },
  { id: "thighs", label: "Thighs" },
];
