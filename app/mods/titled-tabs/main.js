import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex, ScrollHandle } from "gpui-base";
import { spaces, panes, terminals, run, openOverlay, theme, window, shared, layout, settings } from "herdr";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

const MAX_WORDS = 8;
const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
const words = (s) => {
  const all = s.split(/\s+/).filter(Boolean);
  return all.length > MAX_WORDS ? `${all.slice(0, MAX_WORDS).join(" ")}…` : all.join(" ");
};

const REMEMBERED = 200;

// Vertical travel, in px, that one trackpad swipe needs to switch one tab.
const SWIPE_PX = 40;

// A title that says what the work is: not a path, a user@host, or the program's own name.
function telling(raw, prog) {
  const live = clean(raw);
  const path = /^[~/]|^[A-Za-z]:\\/.test((raw ?? "").replace(/^[^\p{L}\p{N}~/]+/u, ""));
  return live && live !== prog?.name && !path && !live.includes("@") && live.toLowerCase() !== prog?.key ? live : "";
}

// An agent's report while it works. "Running <command>" and "Writing /a/path"
// name a tool call, not the work.
const step = (msg) => {
  const m = clean(msg);
  return m && !/^Running\b/.test(m) && !/^\S+\s+[~.]?\//.test(m) ? m : "";
};

// The command a shell runs now: its foreground process, when that isn't the shell.
function command(term, prog) {
  const fg = term?.foreground;
  if (!prog?.shell || !fg?.argv?.length || fg.pid === term.pid) return "";
  return [fg.argv[0].split("/").pop(), ...fg.argv.slice(1)].join(" ");
}

// A tab's two lines, each at most MAX_WORDS words.
// Line 1, what it started as: the name someone gave the tab, else a `started=`
// label, else the first telling title seen for its terminal, else program · folder.
// Line 2, what it does now: a `now=` label, else the agent's latest report (kept
// after it stops), else the shell's latest command, else a word for its status.
// `seen` remembers both per terminal, so they outlive the report and a title change.
function lines(tab, lead, term, seen) {
  const prog = lead?.program ?? term?.program;
  const key = term ? `${term.address}@${term.created_ms}` : null;
  const mine = key ? (seen[key] ??= {}) : {};
  const title = telling(lead?.title ?? term?.title, prog);
  if (title && !mine.start) mine.start = title;
  const latest = step(term?.report?.msg) || command(term, prog);
  if (latest && mine.now !== latest) mine.now = latest;
  if (key) mine.at = term.created_ms;

  const labels = term?.labels ?? {};
  const folder = (lead?.cwd ?? term?.cwd)?.split(/[\\/]/).filter(Boolean).pop();
  const named = tab.named && !/^tb\d+$/.test(tab.name) && tab.name !== prog?.name ? tab.name : "";
  const first = named || clean(labels.started) || mine.start || [prog?.name ?? "Terminal", folder].filter(Boolean).join(" · ");
  let now = clean(labels.now) || mine.now || "";
  if (!now && prog?.agent) {
    now = !mine.start ? "Starting…" : tab.status === "blocked" ? "Needs you" : tab.status === "working" ? "Working…" : "Waiting for your reply";
  }
  return [words(first), words(now)];
}

export default class Tabs extends View {
  init() {
    this.pressed = null;
    this.scroll = ScrollHandle.new();
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
    this.saved = localStorage.getItem("seen") ?? "{}";
    this.seen = JSON.parse(this.saved);
    this.swipe = null;
  }

  // A mouse wheel switches one tab per notch. A trackpad swipe switches at most
  // one tab: it sends many events, then momentum events after "ended", which
  // stock Herdr turned into one tab each. A sideways swipe only scrolls the strip.
  wheel(e) {
    const notch = e.delta_lines;
    if (notch) {
      if (Math.abs(notch.y) > Math.abs(notch.x) && Math.abs(notch.y) >= 1) run(notch.y > 0 ? "tab.prev" : "tab.next");
      return;
    }
    if (e.touch_phase === "started") { this.swipe = { x: 0, y: 0, done: false }; return; }
    if (e.touch_phase !== "moved") { this.swipe = null; return; }
    const g = this.swipe;
    if (!g || g.done) return;
    g.x += e.delta.x; g.y += e.delta.y;
    if (Math.abs(g.x) >= Math.abs(g.y) || Math.abs(g.y) < SWIPE_PX) return;
    g.done = true;
    run(g.y > 0 ? "tab.prev" : "tab.next");
  }

  // Keeps what lines() learned, newest REMEMBERED terminals only.
  saveSeen() {
    const keys = Object.keys(this.seen);
    if (keys.length > REMEMBERED) {
      keys.sort((a, b) => (this.seen[b].at ?? 0) - (this.seen[a].at ?? 0)).slice(REMEMBERED).forEach(k => delete this.seen[k]);
    }
    const text = JSON.stringify(this.seen);
    if (text !== this.saved) { this.saved = text; localStorage.setItem("seen", text); }
  }

  // The side panel is remembered per space: switching shows that space's choice
  // (closed if it never had one), and opening or closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render() {
    const t = theme();
    const space = spaces().find(p => p.active);
    const shown = space?.tabs ?? [];
    const active = shown.findIndex(tab => tab.active);
    const selected = shown[active]?.id;
    if (selected !== this.selected || active !== this.selectedIndex) {
      this.selected = selected;
      this.selectedIndex = active;
      if (active >= 0) this.scroll.scroll_to_item(active);
    }
    const stop = (_e, cx) => cx.stop_propagation();
    const button = (id, label, action) => div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", stop).on_click(action).child(label);
    const terms = terminals();
    const item = (c, i) => {
      const lead = panes().find(p => p.tab === c.id && p.program?.agent) ?? panes().find(p => p.tab === c.id && p.terminal) ?? panes().find(p => p.tab === c.id);
      const program = lead?.program;
      const term = lead?.terminal ? terms.find(x => x.address === lead.terminal) : null;
      const [first, now] = lines(c, lead, term, this.seen);
      // Two lines: what it started as, then ↳ what it does now. Icon, status and
      // close sit on line 1. In a narrow window tabs shrink to 160 px, then scroll.
      return h_flex().id(`tab-${c.id}`).h(46).px(11).py(7).gap(8).rounded(8).items_start().flex_shrink(1).min_w(160).max_w(290)
        // A rename or status dot on this or an earlier tab can push the active one out.
        .when(i <= active, el => el.on_size_change((_size, cx) => { this.scroll.scroll_to_item(active); cx.notify(); }))
        .border(1).border_color(c.active ? t.border : t.chrome).bg(c.active ? t.raised : t.chrome)
        .hover(s => s.bg(t.hover))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        .when(Boolean(program?.icon), el => el.child(
          (program.tint ? svg(program.icon).size(14).text_color(t.muted) : image(program.icon).size(14)).flex_none().mt(2)))
        .child(v_flex().flex_1().min_w(0).gap(3)
          .child(h_flex().min_w(0).gap(7).items_center()
            .child(div().min_w(0).truncate().text_size(13).line_height("16px").font_weight(c.active ? 600 : 500).text_color(t.foreground)
              .child(c.zoomed ? `${first} Z` : first))
            .when(c.status === "working", el => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
            .when(c.status === "blocked" || c.status === "done", el => el.child(div().size(6).flex_none().rounded(3).bg(t[c.status]))))
          .when(Boolean(now), el => el.child(h_flex().min_w(0).gap(4).items_center()
            .child(svg("mods/titled-tabs/arrow.svg").size(11).flex_none().text_color(t.muted))
            .child(div().min_w(0).truncate().text_size(11.5).line_height("13px").text_color(t.muted).child(now)))))
        .when(c.active, el => el.child(div().id(`close-${c.id}`).flex_none().mt(3).text_color(t.dim).on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); }).child(svg("mods/pane/close.svg").size(12))));
    };
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(10, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 10;
    const panel = find(root, "panel"), body = find(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const panelButton = (id, label, icon) => {
      const on = panel && !panel.hidden && body?.active === id;
      return h_flex().id(`panel-${id}`).h(26).px(8).gap(5).flex_none().items_center().rounded(6)
        .text_size(12).bg(on ? t.selected : t.chrome).text_color(on ? t.foreground : t.muted)
        .hover(s => s.bg(t.hover)).on_mouse_down("left", stop)
        .on_click(() => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
        }).child(svg(icon).size(14)).child(label);
    };
    const items = shown.map(item);
    this.saveSeen();
    return h_flex().size_full().min_w(0).px(10).pl(lightsPadding).gap(3).items_center().bg(t.chrome).border_b(1).border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => this.wheel(e))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(3).overflow_x_scrollbar().track_scroll(this.scroll)
        .on_size_change((_size, cx) => { if (active >= 0) { this.scroll.scroll_to_item(active); cx.notify(); } })
        .children(items))
      .child(button("tab-new", "+", () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })))
      .when(enabled.includes("files"), el => el.child(panelButton("files", "Files", "mods/files/file.svg")))
      .when(enabled.includes("changes"), el => el.child(panelButton("changes", "Changes", "mods/changes/changes.svg")))
      .when(w?.buttons, el => el.child(button("minimize", w.platform === "windows" ? svg("mods/titled-tabs/win-min.svg").size(16) : "−", () => run("window.minimize")))
        .child(button("maximize", w.platform === "windows" ? svg(`mods/titled-tabs/${w.maximized ? "win-restore" : "win-max"}.svg`).size(16) : "□", () => run("window.maximize")))
        .child(button("close-window", w.platform === "windows" ? svg("mods/titled-tabs/win-close.svg").size(16) : svg("mods/pane/close.svg").size(13), () => run("window.close"))));
  }
}
