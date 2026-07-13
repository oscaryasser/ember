// Screen wake lock with automatic reacquire on tab return.
// Fails silently on unsupported browsers — the timer still works because all
// timing is timestamp math, not tick counting.

let lock = null;
let wantLock = false;

async function acquire() {
  try {
    if (!navigator.wakeLock) return;
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => { lock = null; });
  } catch { lock = null; }
}

function onVisibility() {
  if (wantLock && document.visibilityState === "visible" && !lock) acquire();
}

export function keepAwake() {
  wantLock = true;
  document.addEventListener("visibilitychange", onVisibility);
  acquire();
}

export function releaseAwake() {
  wantLock = false;
  document.removeEventListener("visibilitychange", onVisibility);
  try { lock?.release(); } catch { /* already gone */ }
  lock = null;
}
