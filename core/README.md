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

Both ends need the patched build: the sending `hc` splits the file, and the
receiving core joins it. With only one end patched, files over 8 MB fail with
an "update hc" message.

## Build

```sh
core/build.sh          # prints the path of the built binary
```

It clones upstream into `.build/herdr-core`, applies `patches/`, and builds with
Rust 1.95 and Zig 0.16.

## Install

On each machine, with the binary built for that machine:

```sh
hc update --from <path printed by build.sh>
```

On macOS, the terminal you run this from needs System Settings → Privacy &
Security → App Management, because the installed `Herdr Core.app` is signed by
Herdr. Without it, `hc update` says the folder "isn't writable by you".

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
