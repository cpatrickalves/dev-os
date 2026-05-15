---
title: "feat: Interactive keyboard-driven skill picker for import-skills.sh"
type: feat
status: active
created: 2026-05-15
depth: lightweight
deepened: 2026-05-15
---

# feat: Interactive keyboard-driven skill picker for import-skills.sh

## Summary

Replace the number-typing selection loop in `scripts/import-skills.sh` with an interactive keyboard picker: Up/Down arrows move a highlighted cursor, Space toggles the skill under the cursor, Enter confirms, `q`/Esc cancels cleanly. Implemented in pure bash constrained to macOS stock bash 3.2.57, scoped to `import-skills.sh` only. Gated by a throwaway prototype spike that proves the raw-mode mechanism on the target shell before the rewrite.

---

## Problem Frame

The current `select_skills()` function (`scripts/import-skills.sh:173-280`) makes the user type a skill number, press Enter, repeat for every skill they want, then type `d` to finish. With 30 skills in the source, selecting several is tedious and error-prone — every selection is a separate type-and-Enter round trip, and the full list redraws each time.

The user wants standard multi-select TUI ergonomics: navigate with arrow keys, toggle with Space while moving freely between items, and press Enter once to commit the whole selection.

---

## Scope Boundaries

**In scope:**
- Rewrite `select_skills()` in `scripts/import-skills.sh` to use a keyboard-driven picker (arrows / Space / Enter / cancel).
- Preserve the existing "all" and "none" bulk actions as keyboard shortcuts within the picker.
- Terminal-state safety: hide/restore cursor, restore terminal mode on normal exit, on cancel, and on interrupt (Ctrl-C).
- A scrolling viewport with a visible scroll indicator so a 30-item list remains usable on a short terminal, including mid-picker terminal resize.
- Non-interactive fallback so `--all` and piped/non-TTY invocations behave deterministically.
- A pre-implementation prototype spike that validates the raw-mode mechanism on macOS bash 3.2.57.

**Non-goals:**
- Fuzzy search / type-to-filter within the picker. (Consequently, first-letter navigation is explicitly out of scope — `a`/`n` remain bulk shortcuts only.)
- Changing the conflict-detection prompt (`check_existing_skills`), import logic (`execute_import`), CLI flags, or skill discovery.
- Cross-platform hardening beyond macOS bash 3.2.57 (see Risks — Linux is a residual risk, not in active scope).

### Deferred to Follow-Up Work
- `scripts/import-agents.sh` carries a near-identical `select_agents()` picker (`import-agents.sh:176`) with the same number-toggle UX. Applying the same change there, and extracting a shared picker into `scripts/common-functions.sh`, is deferred — confirmed out of scope for this change. **Divergence-cost mitigation:** the new picker MUST be written as a single self-contained function with no `import-skills.sh`-specific coupling, so the later extraction into `common-functions.sh` is a move, not a rewrite. Do not add picker features that increase extraction cost. A tracking note for the `import-agents.sh` parity follow-up should be filed when this lands.

---

## Requirements

- **R1.** Arrow keys (Up/Down) move a visible highlighted cursor through the skill list.
- **R2.** Space toggles the selected/deselected state of the skill currently under the cursor, without leaving the picker.
- **R3.** Enter confirms the current selection and proceeds to conflict-detection + import.
- **R4.** Bulk "select all" (`a`) and "select none" (`n`) remain available as single keypresses.
- **R5.** The picker remains usable when the list (30 items) is taller than the terminal — the view scrolls to keep the cursor visible, and a scroll indicator shows there are more items above/below.
- **R6.** The terminal is always restored to a sane state (cursor visible, normal input mode) on confirm, on cancel, on Ctrl-C, and on any `set -e` abort between entering raw mode and cleanup.
- **R7.** `--all` bypasses the picker (unchanged). When stdin is not a TTY and `--all` was not passed, the script prints a clear error directing the user to `--all` and exits non-zero — deterministically, not by falling into a loop.
- **R8.** `q` or a lone Esc cancels the picker cleanly: restores the terminal, prints `Cancelled.`, and exits the script with code 0. This is distinct from the Ctrl-C interrupt path.
- **R9.** Pressing Enter with zero skills selected does not exit; it shows an inline status message (`Select at least one skill, or press q to cancel`) and keeps the picker open. The existing `exit 1` empty-selection path is only reached via the non-TTY guard (R7), never via interactive Enter.
- **R10.** An always-visible instruction line communicates every active key binding so the controls are discoverable without external documentation.

---

## Key Technical Decisions

- **Pure bash, no external dependencies** — confirmed with the user. The considered-and-rejected middle option (detect `fzf`/`gum`, use if present, else bash picker) was set aside in favor of a single zero-dependency code path for consistency with the other `scripts/`. **Fallback if the spike fails:** revert to the existing numeric selector rather than ship a broken TUI (see U3).
- **bash 3.2 input mechanism (corrected from initial draft).** macOS `/bin/bash` is 3.2.57. `read -t` accepts **integer seconds only** — `read -t 0.1` fails with "invalid timeout specification", and `read -t 0` returns failure immediately rather than polling. Therefore:
  - Single keypress: `read -rsn1` (raw, silent, one byte). This needs no global terminal-mode mutation — no `stty` save/restore.
  - Escape sequence: on reading the ESC byte (`$'\e'`), attempt `read -rsn2 -t 1` to grab the `[A`/`[B`/`[C`/`[D` tail. A successful read with `[A`/`[B` is Up/Down. A **timed-out or empty** tail means a lone Esc → treat as cancel (R8). The 1-second worst-case delay applies only to a bare Esc press, which is acceptable since Esc is the cancel action anyway.
  - No `stty` raw mode is used; the only terminal state to manage is cursor visibility.
- **`set -e` guard (canonical pattern).** The script runs under `set -e` (line 8). Every timeout-capable or otherwise expected-non-zero `read` in the picker MUST be written as `read ... || true` (or the loop bracketed with `set +e` … `set -e` restoring prior state). This is the one canonical pattern — it is not re-decided per call site. Without it the script dies the first time a read times out.
- **Cursor / terminal lifecycle via trap.** Hide the cursor with `tput civis` (fallback `printf '\033[?25l'`) before the loop; restore with `tput cnorm` (fallback `printf '\033[?25h'`). Install `trap 'restore_terminal' INT EXIT` immediately before the loop; on every normal return path run `restore_terminal` inline then `trap - INT EXIT` so it does not fire during the later `check_existing_skills`/`execute_import` prompts. `restore_terminal` (show cursor) is idempotent, so a double-fire is harmless — this is what makes the R6 guarantee cheap to hold even on a `set -e` abort.
- **Scrolling viewport with resize tolerance.** Re-read `tput lines` **every loop iteration** (fallback constant `24` when `tput` is absent or non-numeric) so a mid-picker terminal resize is absorbed. `window_height = max(1, tput_lines - header_footer_lines)`. Clamp `cursor` into `[window_start, window_start + window_height - 1]`, adjusting `window_start` before each render. Track `prev_rendered_lines` and clear exactly that many lines each frame (not the fixed `skills + 7` the current `clear_display` assumes) so a variable-height window does not leave stale rows. A scroll indicator (`▲ more above` / `▼ more below`, or a `showing N-M of 30` line) renders when the window does not cover the full list.

---

## Output Structure

No new files. All changes are within `scripts/import-skills.sh` (the prototype spike in U3 is a throwaway, not committed).

---

## Implementation Units

### U3. Prototype spike: validate raw-mode mechanism on bash 3.2.57

**Goal:** Before rewriting `select_skills()`, prove on macOS `/bin/bash` (3.2.57) that the corrected input mechanism works: `read -rsn1` single-key reads, ESC + `read -rsn2 -t 1` tail assembly, the `|| true` `set -e` guard, `tput civis/cnorm` cursor toggling, and in-place ANSI redraw. This is a throwaway script, not committed.

**Requirements:** De-risks R1, R2, R6, R8 (the central mechanism bet).

**Dependencies:** none

**Files:**
- `/tmp/picker-spike.sh` (throwaway — delete after the go/no-go)

**Approach:**
- Write a ~40-line loop: raw single-key read, arrow detection via ESC tail, Space/Enter/q dispatch, cursor hide/restore via trap, redraw a short fixed list in place.
- Run it explicitly under `/bin/bash /tmp/picker-spike.sh` (not the user's interactive shell, which may be a newer bash) and confirm: arrows move, Space toggles, lone Esc resolves within ~1s without hanging, Ctrl-C restores the cursor, no `set -e` abort on a timed-out read.
- **Go/no-go gate:** if any of these fail and cannot be made to work within the bash 3.2 constraint, stop and fall back to keeping the existing numeric selector (the rewrite is abandoned, not shipped broken). Record the outcome before starting U1.

**Patterns to follow:** existing `\033[`/`tput` usage in the current `clear_display` (`import-skills.sh:218-224`).

**Test scenarios** (manual; this unit *is* the test):
- Under `/bin/bash` 3.2.57: arrows move the highlight; Space toggles; Enter exits the loop; `q` and lone Esc exit cleanly within ~1s.
- A timed-out `read` does not abort the spike script (confirms the `|| true` guard under `set -e`).
- Ctrl-C mid-loop returns to the shell with a visible cursor and normal echo.

**Verification:** A documented go/no-go decision exists; if go, the exact working snippets (read flags, ESC tail, trap) are carried into U1. If no-go, the plan is abandoned in favor of the status quo and the user is told why.

---

### U1. Keyboard-driven multi-select picker

**Goal:** Replace the number-typing loop in `select_skills()` with an arrow/Space/Enter picker, including the scrolling viewport with scroll indicator, instruction line, bulk shortcuts, clean cancel, and empty-selection inline warning.

**Requirements:** R1, R2, R3, R4, R5, R8, R9, R10

**Dependencies:** U3 (the validated mechanism)

**Files:**
- `scripts/import-skills.sh` (rewrite `select_skills()`, lines ~173-280, including the nested `display_skill_selection` / `clear_display` helpers)

**Approach:**
- Write the picker as a **single self-contained function** with no `import-skills.sh`-specific globals beyond the existing `SKILL_DIRS`/`SKILL_NAMES`/`SKILL_DESCRIPTIONS`/`selected[]`/`SELECTED_SKILLS` contract, so later extraction to `common-functions.sh` (deferred) is a move, not a rewrite.
- Keep the existing `selected[]` 0/1 array and the final "build `SELECTED_SKILLS`" block unchanged. The empty-selection `exit 1` block is no longer reachable from interactive Enter (R9) — it remains only for the non-TTY guard path (R7, U2).
- Track `cursor` (0-based) and `window_start`. Each iteration: re-read `tput lines`, recompute the window per the Key Technical Decisions viewport math, render the visible rows, the instruction line (R10), and the scroll indicator (R5).
- Row layout is fixed-column so redraw width is deterministic: column 0 = cursor gutter (`>` on the active row, space otherwise), columns 2-4 = `[x]`/`[ ]`, column 5+ = skill name (truncated as today). The active row uses the `>` gutter as the cursor affordance (not reverse video, which can obscure the `[x]` on some terminals).
- Instruction line (R10), pinned above the list, exact text: `↑/↓ navigate   Space toggle   a all   n none   Enter confirm   q quit`.
- Dispatch on the validated keypress reader:
  - Up / Down → move `cursor`, adjust `window_start` if it would leave the window.
  - Space → flip `selected[cursor]`.
  - `a` → all 1; `n` → all 0.
  - Enter → if at least one selected, break to selection build; if zero selected, render an inline status line `Select at least one skill, or press q to cancel` and keep looping (R9).
  - `q` or lone Esc → restore terminal, print `Cancelled.`, `exit 0` (R8).
- Redraw via the existing cursor-up/clear-line technique, clearing `prev_rendered_lines` (tracked), not a fixed constant.

**Patterns to follow:**
- Existing ANSI/`tput` redraw approach in the current `clear_display` (`import-skills.sh:218-224`).
- `BASH_REMATCH`/indexed-array style already used in `discover_skills` and `select_skills` (no bash 4+ syntax — no associative arrays, no `${var,,}`).
- `print_status` / `print_color` helpers from `scripts/common-functions.sh` for the header.

**Test scenarios** (no automated harness exists in this repo and the picker requires a TTY; these are manual verification cases the implementer must run, plus the non-interactive smoke checks in U2):
- Run `scripts/import-skills.sh`: Down moves the highlight down, Up moves it up; the highlight does not run off either end.
- Space toggles the `[ ]`/`[x]` marker under the cursor; moving away and back shows state persisted; multiple skills toggle before Enter.
- `a` marks all `[x]`; `n` clears all to `[ ]`.
- On a terminal short enough that 30 items don't fit, holding Down scrolls the window, the highlighted row stays visible, and the scroll indicator shows `▼`/`▲` (or `showing N-M of 30`) appropriately; scrolling back up works symmetrically.
- Shrinking and growing the terminal **while in the picker** keeps the display coherent (no stale/duplicated rows, cursor stays visible).
- The instruction line is visible on entry and lists every binding.
- Enter with 2+ selected proceeds to the existing conflict/import flow and imports exactly those skills.
- Enter with zero selected shows the inline warning and stays in the picker (does NOT exit).
- `q` cancels: terminal restored, `Cancelled.` printed, exit code 0. Lone Esc behaves identically within ~1s.

**Verification:** Selecting several skills via arrows + Space and pressing Enter once imports exactly that set; the list never requires typing a number; the 30-item list is navigable (with scroll feedback) on a short and resized terminal; cancel and empty-Enter behave per R8/R9.

---

### U2. Terminal lifecycle safety and non-TTY fallback

**Goal:** Guarantee the terminal is always restored and the picker is bypassed deterministically when no interactive terminal is available.

**Requirements:** R6, R7

**Dependencies:** U1

**Files:**
- `scripts/import-skills.sh` (trap + `restore_terminal` around the picker; non-TTY guard in `select_skills()` before the loop)

**Approach:**
- Before the loop: hide the cursor (`tput civis`, fallback `printf '\033[?25l'`), then `trap 'restore_terminal' INT EXIT` where `restore_terminal` runs `tput cnorm` (fallback `printf '\033[?25h'`) and is safe to call repeatedly.
- On every normal return path (confirm in U1, cancel in U1): call `restore_terminal` inline, then `trap - INT EXIT` to detach it before `main()` continues into `check_existing_skills` (which has its own `read -p` prompts at `import-skills.sh:319`).
- Every picker `read` uses the canonical `|| true` guard so a timed-out ESC-tail read cannot trip `set -e` (Key Technical Decisions).
- Non-TTY guard at the top of `select_skills()` (after the existing `--all` short-circuit at `import-skills.sh:174-179`): if `[ ! -t 0 ]`, print a clear error (`No interactive terminal; re-run with --all to import all skills`) and `exit 1`. Do not enter the raw-mode loop. Replace the prior "behave as they do today" framing — no functional non-TTY path existed before this change, so the contract is now defined, not preserved.

**Patterns to follow:**
- The script's `set -e` posture (line 8) and the `--all` short-circuit (`select_skills`, `import-skills.sh:174-179`).

**Test scenarios** (manual + non-interactive smoke):
- Ctrl-C mid-picker: shell prompt returns, cursor visible, echo normal (typed characters appear); terminal not stuck.
- Normal confirm (Enter): after the script finishes, cursor visible, terminal normal; the detached trap does not fire during the conflict prompt or at script end.
- `q`/Esc cancel: same terminal-clean guarantee as Ctrl-C, plus `Cancelled.` and exit 0.
- Force a command failure between raw-mode entry and cleanup (e.g., a deliberately failing line in a scratch copy): confirm `restore_terminal` still runs via the EXIT trap and the terminal is restored.
- `scripts/import-skills.sh --all` still selects all skills without showing the picker (regression check).
- `echo | scripts/import-skills.sh` (non-TTY stdin, no `--all`): prints the directing error and exits non-zero; does not hang and does not leave the terminal in raw mode.

**Verification:** No sequence of confirm, cancel, Ctrl-C, mid-run failure, or non-TTY invocation leaves the terminal in raw/no-cursor state; `--all` is unchanged; non-TTY-without-`--all` is a deterministic error, not a hang.

---

## Risks & Mitigations

- **bash 3.2 mechanism bet (highest risk):** the input mechanism was corrected after feasibility review verified `read -t` rejects fractional timeouts and `set -e` aborts on a timed read. U3's spike is the gate that confirms the corrected mechanism actually works before any rewrite; no-go reverts to the status quo.
- **No automated regression coverage:** the repo has no test harness and the picker needs a TTY, so all behavioral verification is manual. Accepted deliberately. Mitigation: U2 includes non-interactive smoke checks (`--all`, piped-stdin) that *can* be re-run quickly, and the manual checklist in U1/U2 test scenarios should be run as a block after any future edit to this function. The highest-consequence failure (terminal left broken) is specifically covered by the forced-mid-failure scenario in U2.
- **`import-agents.sh` divergence:** shipping this leaves `select_agents()` on the old UX. Mitigation: write the picker self-contained (cheap later extraction) and file a parity-follow-up tracking note when this lands; do not deepen the coupling in the meantime.
- **Terminal corruption from line-wrap:** a very long skill name on a narrow terminal can wrap and desync the cursor-up redraw. Names are already truncated for display today; keep that truncation and treat narrow-width robustness as a residual risk, not in active scope.
- **Linux / alternate terminals:** only macOS bash 3.2.57 is the verified target. Linux bash, tmux/screen, and IDE-integrated terminals are residual risks — the `-t 0` TTY guard catches "no TTY" but not "TTY but degraded". Out of active scope; documented so a future cross-platform pass has the context.
