# Ember 🔥 — recomp coach

A single-user, offline-first PWA for a 6-month body recomposition: 2 runs + 2 strength
sessions a week, ~500 kcal daily deficit, high protein. Garmin and MyFitnessPal capture
the raw numbers; Ember turns them into decisions — am I on pace, what do I train today,
when do I add weight.

**Live:** https://oscaryasser.github.io/ember/

## What's inside

- **Today** — date strip, weigh-in, run/strength session logging, Garmin + MFP numbers,
  protein quick-add, net energy ledger.
- **Guided run timer** — 10-week zero-to-30-minutes plan with Web Audio beeps, vibration,
  3-2-1 countdown ticks, wake lock, and auto-completion. Timer math is timestamp-based,
  so it survives tab throttling.
- **Strength** — A/B days with home/gym variants, per-set logging, "last time" hints,
  auto rest timer with +30s, custom exercises, live PR detection (Epley e1RM).
- **Pull-up program** — separate grease-the-groove track: daily easy sets, grip rotation
  (chin → neutral → wide), band/negative assists, prescriptions auto-scaled from a max
  test every ~10 days, per-grip PR detection and progress charts.
- **Coach** — weekly verdict (on pace / too fast / stalled) judged against *editable*
  goals, 14-day trends, streaks.
- **Progress** — weight vs target, run pace, per-exercise e1RM charts, body measurements,
  progress photos (IndexedDB, never uploaded).
- **Goals** — every number the coach judges against is editable. Nothing is hardcoded.
- **Backup** — export/import full JSON. Imports the original `recomp:data` artifact
  backup unchanged, in any of its wrapper shapes.

## Reliability

The log lives in `localStorage` with an async IndexedDB mirror; boot restores from the
mirror if localStorage is missing. Photos are IndexedDB blobs. A pre-import snapshot is
stashed before any import. Service worker precaches everything — fully offline after
first load.

## Dev

```bash
npm install
npm test          # pure-logic unit tests (segments, coach, import normalizer)
npm run build     # production build + service worker
npm run preview   # serve dist at http://localhost:4173/ember/
npm run icons     # regenerate PNG icons from public/favicon.svg
```

Deploys automatically to GitHub Pages via Actions on every push to `main`.
