// The pane header this layout frames its panes with: { "part": "pane" }. Shows the
// program's icon, the agent's name or the terminal's title, the folder and the agent's
// status; buttons split, zoom and close this pane. A pi pane also carries the toggle
// for its own `pi-changes` panel (mods/herdr-filechanges), a split beside that pane —
// the reason this part exists rather than the stock header. Props: { pane, terminal }.
// Click: focus the pane.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, run, theme, home } from "herdr";

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

// A mod pane carries no program, so `title` is the mod's own name and there is no icon to
// inherit: the panel this layout opens is named and drawn here instead.
const PANEL = { mod: "herdr-filechanges", label: "Pi Changes", icon: "custom-icons/pi.svg" };

// The program's own report first; the key and name are the fallbacks.
function isPi(p) {
  const app = (p.app || (p.program && p.program.key) || "").toLowerCase();
  const name = ((p.program && p.program.name) || "").toLowerCase();
  return app === "pi" || name === "pi";
}

export default class Pane {
  init(cfg) {
    this.cfg = cfg;
    this.hovered = false;
  }

  me() {
    return panes().find((p) => p.pane === this.cfg?.pane);
  }

  button(t, id, name, command, args) {
    return div()
      .id(id)
      .p(3)
      .rounded(4)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/nightgrid/icons/${name}.svg`).size(14));
  }

  // The one panel open in this tab, if any. Panes carry no props, so a mod pane is
  // recognised by its mod name; the tab keeps two panels of the same mod apart.
  panel(tab) {
    return panes().find((p) => p.mod === PANEL.mod && p.tab === tab) ?? null;
  }

  // Accented while this tab has its panel. Opens a split pinned to this pane's
  // terminal — that panel closes itself when the terminal goes away (see
  // mods/herdr-filechanges/main.js), which a layout column never did.
  piButton(t, pane, terminal, open) {
    return div()
      .id(`ph-pi-${pane}`)
      .p(3)
      .rounded(4)
      .text_color(open ? t.accent : t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        if (open) run("pane.close", { pane: open.pane });
        else if (terminal)
          run("pane.split", {
            direction: "right",
            pane,
            mod: PANEL.mod,
            props: { terminal },
          });
      })
      .child(svg("mods/nightgrid/icons/file-diff.svg").size(14));
  }

  render(_cx) {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const openPanel = isPi(p) ? this.panel(p.tab) : null;
    const modPane = p.mod === PANEL.mod;
    const name = modPane
      ? PANEL.label
      : ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = modPane ? icon({ icon: PANEL.icon }, 14) : icon(p.program, 14, t.dim);
    const st = p.status;
    const pane = p.pane;
    return h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .bg(t.background)
      .border_b(1)
      .border_color(t.border)
      .text_size(12)
      .on_hover((hovered, cx) => {
        this.hovered = hovered;
        cx.notify();
      })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().flex_none().truncate().max_w(260).font_medium().text_color(t.foreground).child(name))
      .child(div().flex_1().truncate().text_color(t.dim).child(folder(p.cwd)))
      .when(st === "working", (el) => el.child(svg("mods/nightgrid/icons/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
      .when(st === "blocked", (el) => el.child(div().flex_none().px(6).h(18).flex().items_center().rounded(5).bg(t.blocked + "26").text_size(10.5).font_semibold().text_color(t.blocked).child("Needs you")))
      .when(st === "done", (el) => el.child(div().size(7).flex_none().rounded(4).bg(t.done)))
      .when(this.hovered, (el) =>
        el.when(isPi(p), (e) => e.child(this.piButton(t, pane, p.terminal, openPanel)))
          .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
          .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
          .child(this.button(t, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
          .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
