# desktop: folder drop and transfer progress for Herdr Desktop

Patches on top of [herdrdev/herdr-app](https://github.com/herdrdev/herdr-app).
`UPSTREAM` names the tag they apply to.

## What the patch does

When you drop files or folders from Finder on a terminal that runs on another
machine:

- each item goes there in turn, with `hc put --progress` (a folder too);
- a small card in the pane's bottom-right corner lists every item: "Queued",
  then a thin bar with a %, then ✓ (or ✕ and the reason);
- the card says "Sending 2 of 5 to <machine>", then "Sent 5 to <machine>"
  (or "Sent 3, cancelled 1, failed 1 to <machine>"), and it goes 10 s after
  the last item. A new drop in that time joins it;
- × on a queued or sending row cancels it, and "Cancel all" in the header
  cancels what is left. A queued item never starts. For the sending one, `hc
  put` is stopped, its path is not typed, and the part that arrived is removed
  there (`hc exec --on <machine> -- rm -rf -- <path>`, only for the path that
  hc reported for that item);
- each item's path there is typed at the prompt when it arrives, as before.

It needs the patched `hc` from `core/` on both machines. With the official
`hc`, files still go (without a %), and folders fail with hc's reason.

## Build

```sh
desktop/build.sh       # prints the path of the built Herdr.app
```

It clones upstream into `.build/herdr-app`, applies `patches/`, builds with
Rust 1.95 and Zig 0.16, and signs the bundle ad hoc. It is a build from
source, so it never updates itself to the official Herdr.

## Install

Quit Herdr (your terminals keep running in herdr-core), then:

```sh
mv /Applications/Herdr.app /Applications/Herdr-official.app
cp -R .build/herdr-app/target/Herdr.app /Applications/Herdr.app
open /Applications/Herdr.app
```

The ad-hoc signature is not Herdr's. So macOS asks again for the permissions
that programs in Herdr terminals use (microphone, camera, files, automation).
A bundle built on this Mac has no quarantine flag, so Gatekeeper does not stop
it. A copy downloaded from elsewhere would be stopped.

To go back: quit Herdr, put `Herdr-official.app` back as `Herdr.app`.
