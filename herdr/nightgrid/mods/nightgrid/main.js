// nightgrid: one mod, seven parts. The layout puts a copy of it in each block and
// names the part with props: { part: "tabs" | "spaces" | "agents" | "brand" |
// "footer" | "pane" | "status" }. Only that part starts, so the spaces' git polling, the
// agents' timer and the brand's config watch never run twice.
//
// Props are read with props(), not the init argument: the agents list also opens
// itself as an overlay, for its sort menu ({ sortMenu: true }) and for a row's
// options ({ agentMenu: true, address }).

import { View } from "gpui-kit";
import { props } from "herdr";
import Tabs from "./tabs.js";
import Spaces from "./spaces.js";
import Agents from "./agents.js";
import Chrome from "./chrome.js";
import Pane from "./pane.js";
import Status from "./status.js";

const PARTS = { tabs: Tabs, spaces: Spaces, agents: Agents, brand: Chrome, footer: Chrome, pane: Pane, status: Status };

const partName = (cfg) => (cfg?.sortMenu || cfg?.agentMenu ? "agents" : cfg?.part ?? "brand");

export default class HerdrVan extends View {
  init(_props, cx) {
    this.pick(props(), cx);
  }

  render(cx) {
    // Props can land after init on a fresh layout.
    if (partName(props()) !== this.name) this.pick(props(), cx);
    return this.part.render(cx);
  }

  pick(cfg, cx) {
    this.name = partName(cfg);
    const Part = PARTS[this.name];
    if (!Part) throw new Error(`nightgrid: unknown part "${this.name}"`);
    this.part = new Part();
    this.part.init(cfg, cx);
  }
}
