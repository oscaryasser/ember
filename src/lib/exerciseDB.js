// A browsable exercise database, grouped by primary muscle, for the add /
// swap pickers. Each entry is { name, scheme }. Movement swaps stay equipment-
// aware in exercises.js; this is the "browse everything by muscle" superset.
import { normName } from "./util.js";

export const MUSCLE_GROUPS = [
  "Chest", "Back (lats)", "Back (rows)", "Shoulders", "Rear delts",
  "Triceps", "Biceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core",
];

const C = "3 × 6–10", H = "3 × 8–12", I = "3 × 10–15", ISO = "3 × 12–20";

export const EXERCISE_DB = {
  "Chest": [
    ["Barbell Bench Press", C], ["Dumbbell Bench Press", H], ["Incline Barbell Press", H],
    ["Incline Dumbbell Press (30°)", H], ["Incline Dumbbell Press (45°)", H], ["Decline Bench Press", H],
    ["Machine Chest Press", H], ["Incline Machine Press", H], ["Smith Machine Bench", H],
    ["Pec Deck", I], ["Cable Fly (high-to-low)", I], ["Cable Fly (low-to-high)", I],
    ["Dumbbell Fly", I], ["Push-up", H], ["Weighted Dip", H],
  ],
  "Back (lats)": [
    ["Lat Pulldown", H], ["Wide-Grip Pulldown", H], ["Neutral-Grip Pulldown", H], ["Close-Grip Pulldown", H],
    ["Pull-up", C], ["Chin-up", C], ["Assisted Pull-up", H], ["Straight-Arm Pulldown", I], ["Machine Pullover", I],
  ],
  "Back (rows)": [
    ["Barbell Row", C], ["Pendlay Row", C], ["Dumbbell Row", H], ["Chest-Supported Row", H],
    ["Seated Cable Row", H], ["T-Bar Row", H], ["Machine Row", H], ["Meadows Row", H], ["Inverted Row", H],
  ],
  "Shoulders": [
    ["Overhead Barbell Press", C], ["Seated Dumbbell Shoulder Press", H], ["Arnold Press", H],
    ["Machine Shoulder Press", H], ["Smith Machine Press", H], ["Dumbbell Lateral Raise", ISO],
    ["Cable Lateral Raise", ISO], ["Machine Lateral Raise", ISO], ["Front Raise", I], ["Upright Row", I],
  ],
  "Rear delts": [
    ["Face Pull", I], ["Reverse Pec Deck", ISO], ["Cable Rear-Delt Fly", ISO],
    ["Bent-Over Reverse Fly", ISO], ["Rear-Delt Row", I],
  ],
  "Triceps": [
    ["Triceps Rope Pushdown", I], ["Triceps Bar Pushdown", I], ["Overhead Cable Extension", I],
    ["Overhead Dumbbell Extension", I], ["Skull Crusher", I], ["Close-Grip Bench Press", H],
    ["Dip Machine", H], ["Bench Dips", H],
  ],
  "Biceps": [
    ["Barbell Curl", I], ["EZ-Bar Curl", I], ["Dumbbell Curl", I], ["Incline Dumbbell Curl", I],
    ["Hammer Curl", I], ["Cable Curl", I], ["Preacher Curl", I], ["Concentration Curl", I], ["Reverse Curl", I],
  ],
  "Quads": [
    ["Barbell Back Squat", C], ["Front Squat", C], ["Leg Press", C], ["Incline Leg Press", C],
    ["Hack Squat", H], ["Goblet Squat", H], ["Bulgarian Split Squat", H], ["Walking Lunge", H],
    ["Reverse Lunge", H], ["Leg Extension", I], ["Smith Machine Squat", H], ["Step-up", H],
  ],
  "Hamstrings": [
    ["Romanian Deadlift", H], ["Stiff-Leg Deadlift", H], ["Lying Leg Curl", I], ["Seated Leg Curl", I],
    ["Good Morning", H], ["Cable Pull-Through", I], ["Glute-Ham Raise", H], ["Kettlebell Swing", I],
  ],
  "Glutes": [
    ["Hip Thrust", H], ["Barbell Hip Thrust", H], ["Glute Bridge", H], ["Cable Kickback", I],
    ["Sumo Deadlift", C], ["Step-up", H],
  ],
  "Calves": [
    ["Standing Calf Raise", ISO], ["Seated Calf Raise", ISO], ["Leg-Press Calf Raise", ISO],
    ["Smith Machine Calf Raise", ISO], ["Single-Leg Calf Raise", ISO], ["Donkey Calf Raise", ISO],
  ],
  "Core": [
    ["Cable Crunch", I], ["Hanging Leg Raise", I], ["Hanging Knee Raise", I], ["Ab-Wheel Rollout", I],
    ["Plank (time)", I], ["Side Plank (time)", I], ["Pallof Press", I], ["Decline Sit-up", I],
    ["Russian Twist", I], ["Dead Bug", I],
  ],
};

// Flat list with muscle + a normalized key for lookup.
export const ALL_EXERCISES = MUSCLE_GROUPS.flatMap((muscle) =>
  (EXERCISE_DB[muscle] || []).map(([name, scheme]) => ({ name, scheme, muscle, key: normName(name) }))
);

const BY_KEY = new Map(ALL_EXERCISES.map((e) => [e.key, e]));
export const muscleOf = (name) => BY_KEY.get(normName(name))?.muscle || null;

// Search across the whole DB; empty query returns everything grouped order.
export function searchExercises(query) {
  const q = normName(query);
  if (!q) return ALL_EXERCISES;
  return ALL_EXERCISES.filter((e) => e.key.includes(q));
}

// Other exercises sharing a muscle group (for a richer swap list).
export function sameMuscle(name) {
  const m = muscleOf(name);
  if (!m) return [];
  return (EXERCISE_DB[m] || []).filter(([n]) => normName(n) !== normName(name));
}
