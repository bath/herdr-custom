#!/usr/bin/env bash
# Installs the core that build.sh made as this Mac's hc.
#
# On macOS, hc update takes only a complete signed "Herdr Core.app", and
# macOS App Management stops most terminals (Ghostty, Terminal) from changing
# the installed bundle, which Herdr's team signed. So this script:
#   1. wraps the binary in a bundle and signs it ad hoc (Herdr's mac-bundle
#      and mac-sign scripts; hc update accepts ad-hoc local builds);
#   2. runs hc update in a terminal that herdr-core starts: that process is
#      signed by the same team as the bundle, so macOS lets it replace it.
# Running terminals keep running. To go back: hc update --force.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
src="$here/../.build/herdr-core"
bin=${1:-$src/target/release/herdr-core}
app="$(dirname "$bin")/Herdr Core.app"
log=$(mktemp -t herdr-core-update)

rm -rf "$app"
sh "$src/scripts/mac-bundle" "$bin" "$app"
env -u APPLE_CERTIFICATE_P12 -u APPLE_CERTIFICATE_PASSWORD bash "$src/scripts/mac-sign" "$app"

hc run --json --cwd "$HOME" -- /bin/sh -c \
  "hc update --from '$app' > '$log' 2>&1; echo EXIT=\$? >> '$log'" >/dev/null 2>&1 \
  || true # the update can restart the core before hc run gets its answer
for _ in $(seq 60); do
  grep -q '^EXIT=' "$log" && break
  sleep 2
done
cat "$log"
grep -q '^EXIT=0$' "$log"
grep -aq "Add the bytes to the end of this file" "$HOME/.local/share/herdr-core/current/Contents/MacOS/herdr-core" \
  && echo "hc now has the file drop patch"
