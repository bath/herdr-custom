# app: titled tabs for Herdr Desktop

A user mod and a layout for Herdr Desktop (herdr-app). No change to Herdr's
source.

## What it does

Each top tab shows two lines, each 8 words or fewer (longer text is cut with
`…`):

```
[icon] Icehouse test message  ◌            ← line 1: what the session started as
       ↳ Adding features to the Slack bot  ← line 2: what it does now
```

**Line 1** uses the first of:

1. the name a person gave the tab;
2. a `started=` label on its terminal (`hc label <t> started="…"`);
3. the first useful title the program set (Claude Code sets a short task
   title). The mod keeps it, so line 1 does not change when the title changes;
4. `<program> · <folder>`.

**Line 2** uses the first of:

1. a `now=` label on its terminal (`hc label <t> now="…"`);
2. the agent's latest report (`report.msg`, for example "Publishing the new
   manifest on the tailnet"). The mod keeps the last one after the agent stops.
   It skips reports that only name a tool call ("Running …", "Writing /a/path");
3. for a shell, the command it runs now, and after that the last one;
4. for an agent with nothing yet: "Starting…" before it has a title, then
   "Working…", "Needs you" or "Waiting for your reply" from its status.

The mod keeps lines 1 and 2 per terminal in its `localStorage` (the newest 200
terminals). The working spinner and the done or blocked dot are on line 1.

Look: tab strip 58 px, tab 46 px high and 160–290 px wide (tabs shrink in a
narrow window, then the strip scrolls), line 1 13 px (600 when active), line 2
11.5 px muted. The code is `lines()` and `step()` at the top of
`mods/titled-tabs/main.js`.

Scroll on the tab strip: a mouse wheel switches one tab per notch. A trackpad
swipe up or down switches one tab, however long the swipe and its momentum (stock
Herdr switches one tab for each trackpad event, so the tabs fly past). A
sideways swipe only scrolls the strip. The code is `wheel()`.

## Files

- `mods/titled-tabs/`: a clone of the built-in `tabs` mod (Herdr 0.1.15) with
  the title change.
- `layouts/titled.json`: a clone of the built-in `main` layout (0.1.15). The
  only changes: the tab bar uses `"mod": "titled-tabs"` and is 58 px high.

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
'{"name":"tabs","as":"titled-tabs"}'`), put back the two-line change, and
copy the result here.
