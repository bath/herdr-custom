# core: file drop for hc

Patches on top of [herdrdev/herdr-core](https://github.com/herdrdev/herdr-core).
`UPSTREAM` names the upstream commit they apply to.

## What the patch does

- `hc put` sends a file of any size. It sends pieces of at most 8 MB. The first
  piece makes the file, and each next piece adds to its end (`append`).
  Herdr Desktop uses `hc put` when you drop a file on a remote terminal, so big
  drops work too.
- `drop_dir` in `~/.config/herdr-core/config.toml` puts every file in one
  folder, and the files stay there after the terminal closes:

  ```toml
  drop_dir = "/home/miller/file-drop"
  ```

- `hc put` sends a folder (patch 0002). Every file goes into one new folder
  there, in the same place inside it. A second drop of the same folder goes to
  `name-2`, so the two drops never mix. Links are not followed. Names are made
  safe the same way as file names: a space becomes `_`.
- `hc put --progress` prints one JSON line on stderr for each piece, which
  Herdr Desktop (`desktop/`) shows as a % bar:

  ```json
  {"progress":{"sent":8388628,"total":20000020,"file":"photos/site 1/video.bin"}}
  ```

Both ends need the patched build: the sending `hc` splits the file, and the
receiving core joins it. With only one end patched, files over 8 MB and
folders fail with an "update hc" message.

## Build

```sh
core/build.sh          # prints the path of the built binary
```

It clones upstream into `.build/herdr-core`, applies `patches/`, and builds with
Rust 1.95 and Zig 0.16.

## Install

**Linux**, with the binary built on that machine:

```sh
hc update --from <path printed by build.sh>
```

**macOS:**

```sh
core/install-mac.sh
```

On macOS, `hc update --from <binary>` does not work, for two reasons:

- `hc update` takes only a complete signed `Herdr Core.app`. The script makes
  one with Herdr's `scripts/mac-bundle` and signs it ad hoc with
  `scripts/mac-sign`.
- macOS App Management stops Ghostty, Terminal and other apps from changing
  the installed bundle, because Herdr's team signed it. The error is "isn't
  writable by you". The script runs `hc update` in a terminal that herdr-core
  starts. macOS lets that process change the bundle, because Herdr's team
  also signed it.

The ad-hoc signature is not Herdr's. So macOS can ask again for privacy
permissions (camera, microphone, files) that programs in Herdr terminals use.

To go back to the official release: `hc update --force`.

## Move to a new upstream release

```sh
core/build.sh <new upstream commit>
```

If `git am` stops on a conflict, fix it in `.build/herdr-core`, run
`git am --continue`, then write the patches again and set the new base:

```sh
cd .build/herdr-core && git format-patch <new base>..HEAD -o ../../core/patches
```
