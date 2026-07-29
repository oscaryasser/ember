#!/usr/bin/env bash
# Ember → App Store, using ONLY Xcode-native tooling + an App Store Connect API
# key (no Ruby / fastlane required). Archives, exports a signed app-store IPA,
# and uploads it to App Store Connect. Metadata + "submit for review" is then
# done with `fastlane deliver` (fastlane/) or in the ASC web UI.
#
# Prereqs — export these first (the .p8 is your ASC API key, never commit it):
#   export ASC_KEY_ID=XXXXXXXXXX
#   export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#   export ASC_KEY_PATH=/absolute/path/to/AuthKey_XXXXXXXXXX.p8
#
# Usage:  scripts/appstore-submit.sh            # archive + export + upload
#         scripts/appstore-submit.sh archive    # just archive + export the IPA
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${ASC_KEY_ID:?set ASC_KEY_ID}"
: "${ASC_ISSUER_ID:?set ASC_ISSUER_ID}"
: "${ASC_KEY_PATH:?set ASC_KEY_PATH to the AuthKey_*.p8 file}"

# altool/xcodebuild look for the key here.
mkdir -p "$HOME/.appstoreconnect/private_keys"
cp -f "$ASC_KEY_PATH" "$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"

# Build outside the iCloud-synced tree to avoid codesign xattr ("detritus") errors.
BUILD_DIR="${EMBER_BUILD_DIR:-/private/tmp/ember-appstore}"
ARCHIVE="$BUILD_DIR/Ember.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"
mkdir -p "$BUILD_DIR"

echo "==> Building web bundle (native base) + Capacitor sync"
npm run build:native
npx cap sync ios

echo "==> Archiving (Release, automatic signing, team 898HQB7YB5)"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  -derivedDataPath "$BUILD_DIR/DerivedData" \
  DEVELOPMENT_TEAM=898HQB7YB5 \
  -allowProvisioningUpdates \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8" \
  clean archive

echo "==> Exporting app-store IPA"
xcodebuild -exportArchive -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"

IPA="$(ls "$EXPORT_DIR"/*.ipa | head -1)"
echo "==> Built IPA: $IPA"

if [ "${1:-}" = "archive" ]; then
  echo "Stopping after export (archive mode)."
  exit 0
fi

echo "==> Validating + uploading to App Store Connect"
xcrun altool --validate-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
xcrun altool --upload-app -f "$IPA" -t ios \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "==> Upload complete. Build will appear in App Store Connect after processing."
echo "    Next: push metadata + submit for review with:"
echo "      (fastlane) fastlane ios release"
echo "      (or) finish metadata + Submit in App Store Connect."
