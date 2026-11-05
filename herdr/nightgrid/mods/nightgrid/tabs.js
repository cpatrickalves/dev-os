// The tab bar: flat tabs, drag to reorder, and the + and window buttons, which are
// drawn only while the pointer is on the bar. No per-tab X (close with ctrl-shift-w
// or the right-click menu). On the right, Files / Changes / Notes toggle the
// layout's `panel` column, remembered per space as the shipped tabs mod does.

import { div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, run, openOverlay, theme, window, layout, settings, shared } from "herdr";
import { sidebar } from "./lib.js";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class Tabs {
  init() {
    this.pressed = null;
    this.onBar = false; // the pointer is on the tab bar, so its buttons are drawn
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
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
    const ps = panes();
    // Square hover blocks, full bar height, like the tabs beside them: the width
    // follows the height, so the block stays square whatever the bar's height is.
    const button = (id, label, action) => div().id(id).aspect_square().h_full().flex_none().flex().items_center().justify_center().text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action).child(label);
    const item = (c, i) => {
      const program = ps.find(p => p.tab === c.id && p.program?.agent)?.program ?? ps.find(p => p.tab === c.id)?.program;
      const name = /^tb\d+$/.test(c.name) ? program?.name ?? "Terminal" : c.name;
      // Only the bottom edge is emphasised: every tab reserves the same 2px, transparent
      // while idle, so switching never moves a label.
      return h_flex().id(`tab-${c.id}`).h_full().px(10).gap(7).items_center().flex_none().text_size(12.8)
        .border_b(2).border_color(c.active ? t.accent : "#00000000")
        .bg(c.active ? t.raised : "#00000000").text_color(c.active ? t.foreground : t.muted)
        .hover(s => s.bg(t.hover))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }))
        .when(Boolean(program?.icon), el => el.child(program.tint ? svg(program.icon).size(14).text_color(t.muted) : image(program.icon).size(14)))
        .child(div().max_w(170).truncate().child(c.zoomed ? `${name} Z` : name))
        .when(c.status === "working", el => el.child(svg("mods/nightgrid/icons/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
        .when(c.status === "blocked" || c.status === "done", el => el.child(div().size(6).rounded(3).bg(t[c.status])));
    };
    const root = layout(), panel = find(root, "panel"), body = find(root, "panel-body");
    const enabled = [...(shared("workspace.panels") ?? ["files", "changes"]), "tab-notes"];
    this.syncPanel(space, panel, body, enabled);
    // Pills like the agents list's chips: transparent until hovered, raised with an
    // accent label while their panel is the one shown. Always drawn, unlike + and X,
    // because they also say which panel is open.
    const panelButton = (id, label, icon) => {
      const on = panel && !panel.hidden && body?.active === id;
      return h_flex().id(`panel-${id}`).h(26).px(8).gap(5).flex_none().items_center().rounded(6).text_size(12)
        .bg(on ? t.raised : "#00000000").text_color(on ? t.accent : t.muted)
        .hover(s => s.bg(t.hover).text_color(t.foreground))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
        }).child(svg(icon).size(14)).child(label);
    };
    const w = window(), bar = sidebar(), lights = root?.traffic_lights;
    // macOS draws its traffic lights over the bar, so the tabs leave them room.
    // Elsewhere the first tab starts at the sidebar's edge: no gap to the left.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && lights
      ? Math.max(10, (lights[0] + 64) / settings().zoom - (bar?.hidden ? 0 : bar?.size?.px ?? 0))
      : 0;
    // Windows draws its own style of X; everywhere else the flat one.
    const closeIcon = w?.platform === "windows"
      ? svg("mods/nightgrid/icons/win-close.svg").size(16)
      : svg("mods/nightgrid/icons/close.svg").size(13);
    // No fill of its own, so the layout's backdrop shows through; only the active tab
    // and the hovered one are painted. No bottom border and no right padding: the
    // active tab's edge meets the pane's focus hairline, and the window button meets
    // the window's edge. Buttons appear only while the pointer is on the bar, and the
    // id is what makes it hoverable at all — pointer state is tracked per element id.
    return h_flex().id("tab-bar").size_full().min_w(0).pl(lightsPadding).items_center()
      .on_hover((on, cx) => { if (on !== this.onBar) { this.onBar = on; cx.notify(); } })
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().overflow_x_scrollbar().children(shown.map(item))
        .when(this.onBar, el => el.child(button("tab-new", "+", () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })))))
      .when(Boolean(panel), el => el.child(h_flex().flex_none().gap(3).px(8).items_center()
        .when(enabled.includes("files"), el => el.child(panelButton("files", "Files", "mods/files/file.svg")))
        .when(enabled.includes("changes"), el => el.child(panelButton("changes", "Changes", "mods/changes/changes.svg")))
        .child(panelButton("tab-notes", "Notes", "mods/tab-notes/notes.svg"))))
      .when(this.onBar && Boolean(w?.buttons), el => el.child(button("close-window", closeIcon, () => run("window.close"))));
  }
}
