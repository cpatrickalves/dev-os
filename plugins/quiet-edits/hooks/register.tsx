// Folds an edit's diff and a command's output away in the terminal, the way
// the skins mod's `quiet` folds a read's output.
//
// skins draws the tool row and gives it a chevron, but on the terminal a
// closed row still gets its result under it: Claude Code's whole diff for an
// edit, and skins' output card for a shell command, unless skins can tell the
// command only reads (`SP=/tmp/x; git diff --stat` has an assignment, so it
// cannot). This mod draws nothing there instead, so a closed row is one line
// (`Edit README.md +1 -1`, `Bash npm test 1.7s`). Opening the row's chevron
// shows the diff or the output, drawn by skins.
//
// It only hides what can be opened again: with skins missing or off there is
// no chevron, so the result is left as it is. A failed call and the full
// transcript (ctrl+o, --verbose) always show everything, and so does a
// command that did not run to its end in the foreground.

import { memberOf, read } from 'claude-code'
import type { Register } from 'claude-code'

// The tools whose result is a diff, as skins names them.
const EDITS = new Set(['Edit', 'MultiEdit', 'Write'])

// The tools whose result is a command's output.
const SHELLS = new Set(['Bash', 'PowerShell'])

// The skins mod's own state: its settings, and each tool row's chevron.
const skinsPrefs = { plugin: 'skins', key: 'prefs' } as const
const skinsDisclosure = { plugin: 'skins', key: 'disclosure' } as const

// Whether a command's result is output the opened row can show again: both
// streams there, and the command ran to its end in the foreground. One that
// was interrupted, timed out or sent to the background, or that printed an
// image, keeps its result: what happened to it is not for a fold to hide, and
// skins leaves the last two for Claude Code to draw.
function isFinishedOutput(output: unknown): boolean {
  const record = (typeof output === 'object' && output !== null ? output : {}) as Record<string, unknown>

  return (
    typeof record.stdout === 'string' &&
    typeof record.stderr === 'string' &&
    record.interrupted !== true &&
    record.timedOutAfterMs === undefined &&
    record.backgroundTaskId === undefined &&
    record.isImage !== true
  )
}

export const register: Register = on => {
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const { tool, output, isErrored, isExpanded } = e.props
    const folds = EDITS.has(tool) || (SHELLS.has(tool) && isFinishedOutput(output))

    if (e.surface !== 'terminal' || !folds || isErrored || isExpanded === true) {
      return next(e)
    }

    // No skins, or skins switched off: no chevron to bring the result back.
    const prefs = await read($, skinsPrefs)

    if (prefs === undefined || prefs.skin === 'off') {
      return next(e)
    }

    // An opened row shows its answer: skins draws it, or passes one it cannot draw.
    if ((await read($, memberOf(skinsDisclosure, e))) === 'open') {
      return next(e)
    }

    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}
