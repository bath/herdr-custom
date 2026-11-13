#!/usr/bin/env bash
# Builds herdr-core (hc) from upstream at the base in UPSTREAM, with every
# patch in patches/ applied. Output: .build/herdr-core/target/release/herdr-core
#
# Needs: git, Rust 1.95 (rustup), Zig 0.16 (ZIG=/path/to/zig, or zig on PATH).
# Usage: core/build.sh            build at the pinned base
#        core/build.sh <commit>   try the patches on another upstream commit
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
# shellcheck source=/dev/null
. "$here/UPSTREAM"
base=${1:-$base}
src="$root/.build/herdr-core"
rust=${RUST_TOOLCHAIN:-1.95.0}

if [ ! -d "$src/.git" ]; then
  git clone "$repo" "$src"
fi
cd "$src"
git am --abort 2>/dev/null || true
git fetch --quiet origin
git checkout --quiet --detach "$base"
git -c user.name=shepherd -c user.email=shepherd@localhost am --quiet "$here"/patches/*.patch
git submodule update --init --depth 1

# Put the pinned toolchain's own bin first: Homebrew's rustup does not proxy
# `cargo +<version>`, so ask rustup where that toolchain lives.
rustup toolchain install "$rust" --profile minimal >/dev/null
export PATH="$(rustup run "$rust" rustc --print sysroot)/bin:$PATH"
export ZIG=${ZIG:-$(command -v zig || echo "$HOME/.local/zig/zig")}
zigv=$("$ZIG" version)
case "$zigv" in 0.16.*) ;; *) echo "need Zig 0.16, got $zigv" >&2; exit 1 ;; esac

cargo build --locked --release -p herdr-core
bin="$src/target/release/herdr-core"
for mark in "Add the bytes to the end of this file" "has no files to send"; do
  grep -aq "$mark" "$bin" || { echo "patch missing from build: $mark" >&2; exit 1; }
done
echo "$bin"
