// Movement-pattern exercise catalog. Each program slot is a MOVEMENT (squat,
// horizontal push, …); every catalog entry for that movement + equipment is a
// valid swap, so "the machine's taken" is a two-tap substitution. The A/B
// split is a genuine push / pull upper split with one leg movement each —
// balanced weekly volume, compound-first ordering.

export const MOVEMENTS = {
  squat: {
    label: "Squat · quads", scheme: "3 × 8–12",
    gym:  ["Leg press", "Goblet squat", "Hack squat", "Barbell back squat", "Bulgarian split squat", "Leg extension"],
    home: ["Weight-vest squat", "Bulgarian split squat", "Reverse lunge", "Step-up", "Wall sit (time)"],
  },
  horizPush: {
    label: "Push · chest", scheme: "3 × 8–12",
    gym:  ["Chest press machine", "Dumbbell bench press", "Barbell bench press", "Incline dumbbell press", "Pec deck", "Cable fly"],
    home: ["Weight-vest push-up", "Incline push-up", "Decline push-up", "Diamond push-up", "Band chest press"],
  },
  vertPush: {
    label: "Press · shoulders", scheme: "3 × 8–12",
    gym:  ["Shoulder press machine", "Dumbbell shoulder press", "Barbell overhead press", "Arnold press", "Machine lateral raise", "Dumbbell lateral raise"],
    home: ["Pike push-up", "Band overhead press", "Elevated pike push-up", "Band lateral raise", "Wall handstand hold (time)"],
  },
  triceps: {
    label: "Triceps", scheme: "3 × 10–15",
    gym:  ["Triceps pushdown", "Overhead cable extension", "Dip machine", "Close-grip bench press", "Skull crusher"],
    home: ["Bench dips", "Diamond push-up", "Band pushdown", "Overhead band extension", "Close-grip push-up"],
  },
  core: {
    label: "Core", scheme: "3 × 12–15",
    gym:  ["Cable crunch", "Hanging knee raise", "Ab-wheel rollout", "Plank (time)", "Pallof press"],
    home: ["Plank (time)", "Hollow-body hold (time)", "Lying leg raise", "Side plank (time)", "Dead bug"],
  },
  hinge: {
    label: "Hinge · hamstrings", scheme: "3 × 8–12",
    gym:  ["Dumbbell Romanian deadlift", "Seated leg curl", "Hip thrust", "Back extension", "Cable pull-through", "Kettlebell swing"],
    home: ["Banded RDL", "Vest good-morning", "Single-leg RDL", "Glute bridge", "Slider leg curl"],
  },
  vertPull: {
    label: "Pull · lats", scheme: "3 × 8–12",
    gym:  ["Lat pulldown", "Assisted pull-up", "Neutral-grip pulldown", "Pull-up", "Straight-arm pulldown", "Machine pullover"],
    home: ["Band-assisted pull-up", "Band lat pulldown", "Doorway pull-up", "Vertical towel row", "Straight-arm band pulldown"],
  },
  horizPull: {
    label: "Row · mid-back", scheme: "3 × 8–12",
    gym:  ["Seated cable row", "Chest-supported row", "Dumbbell row", "Barbell row", "T-bar row", "Machine row"],
    home: ["Band row", "Inverted row (under table)", "Single-arm band row", "Backpack row", "Prone Y-T-W raise"],
  },
  rearDelt: {
    label: "Rear delts", scheme: "3 × 12–15",
    gym:  ["Face pull", "Reverse pec deck", "Cable rear-delt fly", "Bent-over reverse fly", "Rear-delt machine"],
    home: ["Band face pull", "Band pull-apart", "Prone reverse fly", "Vest bent reverse fly", "Y-raise"],
  },
  biceps: {
    label: "Biceps", scheme: "3 × 10–15",
    gym:  ["Cable curl", "Dumbbell curl", "Preacher curl", "Incline dumbbell curl", "Concentration curl"],
    home: ["Band curl", "Backpack curl", "Chin-up (biceps)", "Isometric towel curl (time)", "Vest curl"],
  },
  inclinePush: {
    label: "Incline · upper chest", scheme: "3 × 8–12",
    gym:  ["Incline dumbbell press", "Incline barbell press", "Incline machine press", "Incline cable fly", "Low-to-high cable fly"],
    home: ["Decline push-up", "Feet-elevated push-up", "Band low-to-high fly", "Pseudo-planche push-up", "Archer push-up"],
  },
  lateralRaise: {
    label: "Side delts", scheme: "3 × 12–20",
    gym:  ["Dumbbell lateral raise", "Cable lateral raise", "Machine lateral raise", "Lean-away cable raise", "Leaning dumbbell raise"],
    home: ["Band lateral raise", "Lean-away band raise", "Water-jug lateral raise", "Vest lateral raise (light)", "Partial-rep raise"],
  },
  hammer: {
    label: "Brachialis / forearms", scheme: "3 × 10–15",
    gym:  ["Hammer curl", "Cable rope hammer curl", "Reverse curl", "Cross-body hammer curl", "Preacher hammer curl"],
    home: ["Hammer band curl", "Backpack hammer curl", "Reverse band curl", "Water-jug hammer curl", "Towel hammer hold (time)"],
  },
  lunge: {
    label: "Lunge · unilateral", scheme: "3 × 8–10 / leg",
    gym:  ["Walking lunge", "Bulgarian split squat", "Reverse lunge", "Dumbbell step-up", "Single-leg leg press"],
    home: ["Reverse lunge", "Bulgarian split squat", "Vest walking lunge", "Step-up", "Split squat"],
  },
  calves: {
    label: "Calves", scheme: "4 × 12–20",
    gym:  ["Standing calf raise", "Seated calf raise", "Leg-press calf raise", "Smith calf raise", "Single-leg calf raise"],
    home: ["Single-leg calf raise", "Vest calf raise", "Stair calf raise", "Double-leg calf raise", "Donkey calf raise"],
  },
};

// Push / Pull / Legs. Each day: compound → secondary → isolation, balanced
// weekly volume. Push = chest/shoulders/triceps, Pull = back/rear-delts/arms,
// Legs = quads/hams/calves/core.
export const PROGRAM = {
  P: { name: "Push · chest / shoulders / triceps", short: "Push", movements: ["horizPush", "vertPush", "inclinePush", "lateralRaise", "triceps"] },
  U: { name: "Pull · back / rear delts / arms", short: "Pull", movements: ["vertPull", "horizPull", "rearDelt", "biceps", "hammer"] },
  L: { name: "Legs · quads / hams / calves / core", short: "Legs", movements: ["squat", "hinge", "lunge", "calves", "core"] },
};

// One source of truth for the strength-day ids and their chips/badges.
export const STRENGTH_DAYS = Object.keys(PROGRAM); // ["P","U","L"]
export const STRENGTH_META = {
  P: { letter: "P", label: "Push", color: "var(--fuel)" },
  U: { letter: "U", label: "Pull", color: "var(--good)" },
  L: { letter: "L", label: "Legs", color: "#b58cf0" },
};

const withScheme = (name, mv) => `${name} — ${mv.scheme}`;

// Default STRENGTH object in the "Name — scheme" string shape the cards expect.
export function buildStrength() {
  const out = {};
  for (const [id, def] of Object.entries(PROGRAM)) {
    out[id] = { name: def.name, home: [], gym: [] };
    for (const key of def.movements) {
      const mv = MOVEMENTS[key];
      out[id].home.push(withScheme(mv.home[0], mv));
      out[id].gym.push(withScheme(mv.gym[0], mv));
    }
  }
  return out;
}

// name (before "—") → movement key, for reverse lookup after a swap.
const NAME_TO_MOVEMENT = (() => {
  const map = {};
  for (const [key, mv] of Object.entries(MOVEMENTS)) {
    for (const n of [...mv.gym, ...mv.home]) map[n] = key;
  }
  return map;
})();

export const movementOf = (name) => NAME_TO_MOVEMENT[name] || null;
export const movementLabel = (name) => {
  const k = movementOf(name);
  return k ? MOVEMENTS[k].label : null;
};

// Up to 5 alternatives that train the same pattern with the same equipment.
export function substitutesFor(name, mode) {
  const key = NAME_TO_MOVEMENT[name];
  if (!key) return [];
  const mv = MOVEMENTS[key];
  const opts = mode === "home" ? mv.home : mv.gym;
  return opts.filter((n) => n !== name).slice(0, 5).map((n) => withScheme(n, mv));
}

// Base exercise list for a session with per-day swaps applied.
export function sessionList(strength, day, id, mode) {
  const base = strength[id][mode];
  const swaps = (day?.swaps || {})[id] || {};
  return base.map((ex, i) => swaps[i] || ex);
}
