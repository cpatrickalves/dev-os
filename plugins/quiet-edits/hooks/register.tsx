// Folds an edit's diff away in the terminal, the way the skins mod's `quiet`
// folds a read's output.
//
// skins draws the tool row and gives it a chevron, but on the terminal it
// leaves a closed row's result to Claude Code, which draws the whole diff
// under it. This mod draws nothing there instead, so a closed Edit row is one
// line (`Edit README.md +1 -1`). Opening the row's chevron shows the diff,
// drawn by skins.
//
// It only hides what can be opened again: with skins missing or off there is
// no chevron, so the result is left as it is. A failed edit and the full
// transcript (ctrl+o, --verbose) always show everything.

import { memberOf, read } from 'claude-code'
import type { Register } from 'claude-code'

// The tools whose result is a diff, as skins names them.
const EDITS = new Set(['Edit', 'MultiEdit', 'Write'])

// The skins mod's own state: its settings, and each tool row's chevron.
const skinsPrefs = { plugin: 'skins', key: 'prefs' } as const
const skinsDisclosure = { plugin: 'skins', key: 'disclosure' } as const

export const register: Register = on => {
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const { tool, isErrored, isExpanded } = e.props

    if (e.surface !== 'terminal' || !EDITS.has(tool) || isErrored || isExpanded === true) {
      return next(e)
    }

    // No skins, or skins switched off: no chevron to bring the diff back.
    const prefs = await read($, skinsPrefs)

    if (prefs === undefined || prefs.skin === 'off') {
      return next(e)
    }

    // An opened row shows its answer: skins draws the diff, or passes one it cannot draw.
    if ((await read($, memberOf(skinsDisclosure, e))) === 'open') {
      return next(e)
    }

    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}
