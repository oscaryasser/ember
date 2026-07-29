# App Privacy — nutrition label answers (App Store Connect › App Privacy)

Ember collects **no data**. Everything is stored on-device; there is no backend,
no analytics, no ads, no third-party SDKs. HealthKit data is read-only, used only
to fill the local log, and never leaves the device.

## Data Collection
**Answer: "Do you or your third-party partners collect data from this app?" → No.**

Rationale: "Collect" (per Apple) means transmitting data off the device. Ember
never transmits anything — HealthKit reads, manual entries, photos, and the JSON
backup all stay in local storage / the user-initiated export file. Health data
read via HealthKit is explicitly **not** used for tracking and is **not** linked
to the user's identity.

## Tracking
**App Tracking Transparency: not used. No tracking. IDFA not accessed.**

## HealthKit-specific review notes (App Review > App Information / Review Notes)
- Ember requests **read-only** HealthKit access (bodyMass, stepCount,
  sleepAnalysis, activeEnergyBurned, workouts). It never writes to HealthKit.
- HealthKit data is used solely to auto-fill the user's on-device fitness log.
- HealthKit data is **not** shared with third parties, **not** used for
  advertising or data-mining, and **never** transmitted off the device.
- Privacy policy: https://oscaryasser.github.io/ember/privacy.html

## Encryption / export compliance
- Uses only standard OS TLS/HTTPS (none, actually — app is fully offline).
- `ITSAppUsesNonExemptEncryption = NO` (set in submission_information).
