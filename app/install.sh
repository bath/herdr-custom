#!/usr/bin/env bash
# Installs our Herdr Desktop mods and layouts into ~/.config/herdr-app, checks
# each mod, and switches to the titled layout.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
config=${HERDR_APP_CONFIG:-$HOME/.config/herdr-app}

mkdir -p "$config/mods" "$config/layouts"
for mod in "$here"/mods/*/; do
  name=$(basename "$mod")
  mkdir -p "$config/mods/$name"
  cp -R "$mod". "$config/mods/$name/"
  herdr-app check "$config/mods/$name"
done
cp "$here"/layouts/*.json "$config/layouts/"
herdr-app do layout.switch '{"name":"titled"}'
