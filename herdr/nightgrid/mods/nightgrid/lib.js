// Shared by every part of the nightgrid mod: the sidebar block, the rail test, the
// hover claim and the toggle. One copy, so the 160px threshold and the width to
// return to cannot drift between the tab bar, the lists and the brand.

import { layout, run, shared, setShared, window } from "herdr";

// This layout's first block, so no tree walk is needed.
export const sidebar = () => layout()?.children?.find((n) => n.id === "sidebar");

// The rail goes by width, not a flag: dragging the sidebar's edge narrows it too.
export const narrow = () => (sidebar()?.size?.px ?? Infinity) < 160;

// True while the pointer is on any part of the sidebar. Its parts are separate
// copies of this mod, so the answer has to travel through shared state; each part
// claims it by name and clears only its own claim, so moving from one part to the
// next never reads as having left the sidebar.
export const onSidebar = () => shared("sidebar.hover") != null;

// A write re-renders every part, so only a real change is written.
export const claimSidebarHover = (part) => (on) => {
  const now = shared("sidebar.hover");
  const next = on ? part : now === part ? null : now;
  if (next !== now) setShared("sidebar.hover", next);
};

// To the rail (on macOS wide enough for the traffic lights), or back to the width it had.
export function toggleSidebar() {
  const rail = narrow();
  if (!rail) setShared("sidebar.width", sidebar()?.size?.px);
  setShared("sidebar.collapsed", !rail);
  run("layout.resize", { id: "sidebar", px: rail ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}
