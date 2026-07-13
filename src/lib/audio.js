// Web Audio beep engine. iOS only allows audio after a user gesture, so
// unlock() must be called from the tap that starts a timer. Everything here
// no-ops silently if audio is unavailable — cues must never break logging.

let ctx = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    // A silent buffer "primes" iOS output inside the gesture.
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    return true;
  } catch {
    return false;
  }
}

function tone(freq, durMs, delayMs = 0, gain = 0.5, type = "sine") {
  try {
    if (!ctx || ctx.state !== "running") return;
    const t0 = ctx.currentTime + delayMs / 1000;
    const dur = durMs / 1000;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch { /* never block */ }
}

export function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* iOS Safari: unsupported, fine */ }
}

// --- Named cues ---
export const cues = {
  countTick: () => { tone(880, 120, 0, 0.35); },
  jog: () => { tone(660, 140); tone(990, 220, 160); vibrate([120, 60, 120]); },
  walk: () => { tone(990, 140); tone(660, 260, 160); vibrate([250]); },
  rest: () => { tone(740, 160); vibrate([150]); },
  restDone: () => { tone(880, 130); tone(880, 130, 180); tone(1175, 300, 360); vibrate([120, 80, 120, 80, 240]); },
  done: () => {
    tone(660, 150); tone(830, 150, 170); tone(990, 150, 340); tone(1320, 450, 510);
    vibrate([150, 80, 150, 80, 400]);
  },
  pr: () => { tone(990, 120); tone(1320, 260, 140); vibrate([80, 40, 200]); },
};
