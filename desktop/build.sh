#!/usr/bin/env bash
# Builds Herdr Desktop (herdr-app) for macOS from upstream at the base in
# UPSTREAM, with every patch in patches/ applied, as an ad-hoc signed bundle.
# Output: .build/herdr-app/target/Herdr.app (its path is printed last).
#
# This is a build from source: it never updates itself, so the patches stay.
#
# Needs: git, Rust 1.95 (rustup), Zig 0.16 (ZIG=/path/to/zig, or zig on PATH).
# Usage: desktop/build.sh            build at the pinned base
#        desktop/build.sh <tag>      try the patches on another upstream tag
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
# shellcheck source=/dev/null
. "$here/UPSTREAM"
base=${1:-$base}
src="$root/.build/herdr-app"
rust=${RUST_TOOLCHAIN:-1.95.0}

[ "$(uname -s)" = Darwin ] || { echo "desktop/build.sh builds the macOS app" >&2; exit 1; }
if [ ! -d "$src/.git" ]; then
  git clone "$repo" "$src"
fi
cd "$src"
git am --abort 2>/dev/null || true
git fetch --quiet --tags origin
git checkout --quiet --detach "$base"
git -c user.name=herdr-custom -c user.email=herdr-custom@localhost am --quiet "$here"/patches/*.patch
git submodule update --init --recursive

# Homebrew's rustup does not proxy `cargo +<version>`: put that toolchain first.
rustup toolchain install "$rust" --profile minimal >/dev/null
export PATH="$(rustup run "$rust" rustc --print sysroot)/bin:$PATH"
export ZIG=${ZIG:-$(command -v zig || echo "$HOME/.local/zig/zig")}
zigv=$("$ZIG" version)
case "$zigv" in 0.16.*) ;; *) echo "need Zig 0.16, got $zigv" >&2; exit 1 ;; esac

# No HERDR_APP_RELEASE: a release build would update itself to stock Herdr.
cargo build --release --locked

version=$(sed -n 's/^version = "\(.*\)"/\1/p' Cargo.toml | head -1)
app="$src/target/Herdr.app"
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp target/release/herdr-app "$app/Contents/MacOS/Herdr"
cp assets/icons/Herdr.icns "$app/Contents/Resources/Herdr.icns"
cp LICENSE THIRD-PARTY-NOTICES "$app/Contents/Resources/"
cat > "$app/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
    <key>CFBundleExecutable</key><string>Herdr</string>
    <key>CFBundleIdentifier</key><string>dev.herdr.app</string>
    <key>CFBundleName</key><string>Herdr</string>
    <key>CFBundleDisplayName</key><string>Herdr</string>
    <key>CFBundleIconFile</key><string>Herdr</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>$version</string>
    <key>CFBundleVersion</key><string>$version</string>
    <key>NSMicrophoneUsageDescription</key><string>Terminal programs running in Herdr can use the microphone, for example for voice input.</string>
    <key>NSCameraUsageDescription</key><string>Terminal programs running in Herdr can use the camera.</string>
    <key>NSAppleEventsUsageDescription</key><string>Terminal programs running in Herdr can use AppleScript to control other apps.</string>
    <key>NSPrincipalClass</key><string>NSApplication</string>
    <key>NSHighResolutionCapable</key><true/>
    <key>LSEnvironment</key><dict/></dict></plist>
PLIST
env -u APPLE_CERTIFICATE_P12 -u APPLE_CERTIFICATE_PASSWORD bash scripts/mac-sign "$app"
codesign --verify --strict "$app"
echo "$app"
