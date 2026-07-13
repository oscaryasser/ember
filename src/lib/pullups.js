// The pull-up program: grease the groove. Runs beside (not inside) the A/B
// strength plan — many easy submaximal sets, daily or near-daily, never to
// failure. Everything prescribes off a periodically re-tested max, and grips
// rotate chin → neutral → wide so no single day hammers one angle.
import { weekKeys } from "./dates.js";
import { num } from "./util.js";

export const GRIP_ORDER = ["chin", "neutral", "wide"];
export const GRIPS = {
  chin: { label: "Chin-up", short: "Chin", hint: "palms toward you — most biceps, your strongest grip" },
  neutral: { label: "Neutral", short: "Neutral", hint: "palms facing — easiest on elbows and shoulders" },
  wide: { label: "Wide pull-up", short: "Wide", hint: "palms away, hands wide — most lats, hardest grip" },
};
export const ASSISTS = [
  ["full", "Strict"],
  ["band", "Band"],
  ["neg", "Negatives"],
];

export const TEST_EVERY_DAYS = 10;

export const pullupSets = (day) => day?.pullups?.sets || [];
export const pullupVolume = (day) => pullupSets(day).reduce((a, s) => a + (num(s.reps) || 0), 0);

// Ascending list of days with pull-up work logged.
export const pullupDayKeys = (data) =>
  Object.keys(data.days).filter((k) => pullupSets(data.days[k]).length > 0).sort();

// Rotate by session count, not by calendar, so missed days never skip a grip.
export function suggestedGrip(data, dateKey) {
  const day = data.days[dateKey];
  const own = pullupSets(day);
  if (own.length) return own[0].grip; // day already started — stay consistent
  const prior = pullupDayKeys(data).filter((k) => k < dateKey);
  return GRIP_ORDER[prior.length % GRIP_ORDER.length];
}

// All max tests ascending; optionally one grip only.
export function testHistory(data, grip = null) {
  return Object.entries(data.days)
    .filter(([, d]) => d?.pullups?.test && (grip === null || d.pullups.test.grip === grip))
    .map(([k, d]) => ({ k, grip: d.pullups.test.grip, reps: num(d.pullups.test.reps) ?? 0 }))
    .sort((a, b) => (a.k < b.k ? -1 : 1));
}

// Best tested reps for a grip strictly before a date (for PR detection).
export function bestTestBefore(data, grip, beforeKey) {
  const hist = testHistory(data, grip).filter((t) => t.k < beforeKey);
  return hist.length ? Math.max(...hist.map((t) => t.reps)) : null;
}

// Working max for a grip: latest test on that grip, else latest on any grip
// (a rough anchor is better than no prescription at all).
export function workingMax(data, grip) {
  const own = testHistory(data, grip);
  if (own.length) return { ...own[own.length - 1], exact: true };
  const any = testHistory(data);
  if (any.length) return { ...any[any.length - 1], exact: false };
  return null;
}

// Daily prescription tiers. Reps are per set; the whole point is that every
// set feels easy — strength grows on the days you don't grind.
export function prescription(max) {
  if (max === null || max === undefined) {
    return {
      level: "Test day", sets: 1, reps: null,
      scheme: "One honest max set of strict chin-ups — 0 is a valid score",
      why: "Everything scales from your tested max. Retest every " + TEST_EVERY_DAYS + " days.",
    };
  }
  if (max <= 0) {
    return {
      level: "Foundation", sets: 5, reps: 3,
      scheme: "5 × 3 slow negatives (jump up, 5 s down) or 5 × 5 band-assisted",
      why: "Negatives and band reps build exactly the strength that becomes rep #1.",
    };
  }
  if (max <= 3) {
    const r = Math.max(1, Math.ceil(max / 2));
    return {
      level: "Groove", sets: 6, reps: r,
      scheme: `6 easy sets of ${r}, spread through the day`,
      why: "Frequent crisp singles and doubles teach the nervous system the movement.",
    };
  }
  if (max <= 7) {
    const r = Math.max(2, Math.round(max * 0.5));
    return {
      level: "Volume", sets: 5, reps: r,
      scheme: `5 easy sets of ${r}, spread through the day`,
      why: "~50% of max per set — always crisp, never grinding.",
    };
  }
  const r = Math.round(max * 0.6);
  return {
    level: "Density", sets: 5, reps: r,
    scheme: `5 sets of ${r} · once a week make one set weighted`,
    why: "At 8+ strict reps, density plus a little load keeps the max climbing.",
  };
}

export function daysSinceTest(data, grip, dateKey) {
  const hist = testHistory(data, grip).filter((t) => t.k <= dateKey);
  if (!hist.length) return null;
  const last = new Date(hist[hist.length - 1].k + "T12:00:00");
  const now = new Date(dateKey + "T12:00:00");
  return Math.round((now - last) / 86400000);
}

export const testDue = (data, grip, dateKey) => {
  const d = daysSinceTest(data, grip, dateKey);
  return d === null || d >= TEST_EVERY_DAYS;
};

// Week stats (Monday weeks, matching the rest of the coach).
export const weekPullupDays = (data, dateKey) =>
  weekKeys(dateKey).filter((k) => pullupSets(data.days[k]).length > 0).length;

export const weekPullupReps = (data, dateKey) =>
  weekKeys(dateKey).reduce((a, k) => a + pullupVolume(data.days[k]), 0);

export const pullupStarted = (data) =>
  pullupDayKeys(data).length > 0 || testHistory(data).length > 0;
