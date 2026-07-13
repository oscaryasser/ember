export const todayKey = () => new Date().toLocaleDateString("en-CA");

export const keyOffset = (offset, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
};

export const keyPlus = (key, offset) => keyOffset(offset, new Date(key + "T12:00:00"));

export const shortDay = (key) =>
  new Date(key + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });

export const niceDate = (key) =>
  new Date(key + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

export const shortDate = (key) =>
  new Date(key + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Monday-start week keys for the week containing `key`
export const weekKeys = (key) => {
  const d = new Date(key + "T12:00:00");
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  const start = new Date(d);
  start.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x.toLocaleDateString("en-CA");
  });
};

export const fmtClock = (secs) => {
  const s = Math.max(0, Math.round(secs));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};
