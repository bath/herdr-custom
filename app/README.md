# app: titled tabs for Herdr Desktop

A user mod and a layout for Herdr Desktop (herdr-app). No change to Herdr's
source.

## What it does

Each top tab says what its work is, in 8 words or fewer. It uses the first of:

1. the name a person gave the tab;
2. the title the program set (Claude Code sets a short task title);
3. `<program> · <folder>`.

Longer titles are cut with `…`. Tab text can be up to 360 px wide (built-in:
170 px). The code is `tabTitle()` and `words()` at the top of
`mods/titled-tabs/main.js`.

## Files

- `mods/titled-tabs/`: a clone of the built-in `tabs` mod (Herdr 0.1.15) with
  the title change.
- `layouts/titled.json`: a clone of the built-in `main` layout (0.1.15). The
  only change: the tab bar uses `"mod": "titled-tabs"`.

## Install

```sh
app/install.sh
```

It copies the files into `~/.config/herdr-app`, runs `herdr-app check` on the
mod, and switches to the `titled` layout. To go back:
`herdr-app do layout.switch '{"name":"main"}'`.

## After a Herdr update

Herdr does not update clones. When Herdr changes its built-in `tabs` mod or
`main` layout, clone them again (`herdr-app do mod.clone
'{"name":"tabs","as":"titled-tabs"}'`), put back the `tabTitle()` change, and
copy the result here.
