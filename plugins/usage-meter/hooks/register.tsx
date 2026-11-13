// Usage Meter: the model and its effort, the context window's fill and the plan's rate-limit windows
// as one row of pills: "Model: Opus 5.5 (medium) | Ctx Used: 7.0% | Session: 50.0% | Reset: 19m".
// The row sits under the prompt, in the footer, where a status line would; `position: above`
// puts it back in the band over the prompt, where upstream draws. The pills are flat and
// tinted, to sit quietly by herdr's straight lines; `caps: round` gives them powerline ends.
//
// A Dev-OS fork of usage-meter 0.1.1 from https://github.com/hamzafer/claude-code-mods
// (commit 7e60143, MIT, see ../LICENSE). Upstream draws block bars and the session's cost;
// this one draws tinted pills in the Tokyo Night colors and leaves the cost out. The readings, the countdown timer, the
// toasts past 90% are upstream's.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement, RenderNode, Timer } from 'claude-code'

import type { UsageMeterSnapshot, UsageMeterWindow } from '../types'

const TICK_MS = 60_000
const GAP_ROWS = 2 // in the band: empty rows between the transcript and the pills
const FOOTER_GAP_ROWS = 1 // in the footer: empty rows between the hint line and the pills
const FOOTER_MARGIN = 4 // in the footer: the two cells the engine indents its lines by, on each side
const FOOTER_COLUMNS = 80 // where the surface does not say how wide it is
const HIGH_AT = 75 // a window past this turns amber, and a secondary window shows up
const WARN_AT = 90 // past this it turns red and raises a toast
const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' } // in toasts
const TITLES: Record<string, string> = { five_hour: 'Session', seven_day: 'Week', spend_limit: 'Spend' } // in pills
const ORDER = ['five_hour', 'seven_day', 'spend_limit']
const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku']
const MODEL_MAX = 24
const TINT = 0.25 // how much of a pill's color its background takes, over the theme's background: 0 to 1

// Powerline half circles: they need a Nerd Font (or any powerline font) in the terminal.
const CAP_LEFT = ''
const CAP_RIGHT = ''

// The colors of Dev-OS's theme: Tokyo Night, as herdr/nightgrid/themes/tokyo-night.json and the
// nightgrid skin (configs/claude-skins) have them. A pill's text is its color, and its background the
// same color faded into the theme's background (TINT): a terminal has no alpha, so the fade is mixed
// here. The model and the windows are colored; the context and the countdown are in the foreground's
// gray, so colored and gray alternate along the row.
const INK = '#1a1b26' // background
const TEXT = '#c0caf5' // foreground
const CYAN = '#7dcfff'
const BLUE = '#7aa2f7' // accent
const AMBER = '#e0af68' // working
const RED = '#f7768e' // blocked

// Held by the host, so they survive a hot reload of this file.
const snapshot = atom({ plugin: 'usage-meter', key: 'snapshot' } as const, null as UsageMeterSnapshot | null)
const tick = atom({ plugin: 'usage-meter', key: 'tick' } as const, 0)
const warned = atom({ plugin: 'usage-meter', key: 'warned' } as const, {} as Record<string, number>)

type PillKind = 'model' | 'context' | 'window' | 'reset' | 'extra'
export type Pill = { kind: PillKind; text: string; bg: string; fg: string }
type Context = { tokens?: number; window: number; percent?: number }
type Elements = ReturnType<EngineInterface['ui']['resolve']>


export const register: Register = (on, options) => {
  const config = (options ?? {}) as Record<string, unknown>
  // userConfig.caps: 'round' ends the pills in powerline half circles (a Nerd Font's); flat by default.
  const isRound = String(config.caps ?? 'none').trim().toLowerCase() === 'round'
  // userConfig.position: 'below' draws under the prompt; 'above' in the band over it.
  const isBelow = String(config.position ?? 'below').trim().toLowerCase() !== 'above'
  let timer: Timer | undefined // one countdown timer, even if session.start fires again

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    // Moves the reset countdown on while a window has a reset time, and picks up a /model switch.
    timer?.cancel()
    timer = $.clock.every(TICK_MS, () => {
      void (async () => {
        const snap = await read($, snapshot)
        if (!snap) return
        const model = await currentModel($)
        if (model !== snap.model) await update($, snapshot, s => (s ? { ...s, model } : s))
        if (snap.rateLimits.some(w => w.resetsAt)) await update($, tick, n => n + 1)
      })().catch(() => {})
    })
    const usage = await $.session.usage().catch(() => null)
    await take($, usage?.context, usage?.rateLimits ?? []).catch(() => {})
    return result
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await take($, e.context, e.rateLimits).catch(() => {})
    return result
  })

  // Under the prompt: the footer's hint line stays, and the pills take a row of their own beneath it,
  // an empty row apart.
  // The effort rides each model request of the main loop, not $.session: the pill shows it once the
  // session's first request has gone out, and a /effort change at the next one.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) await noteEffort($, e.effort).catch(() => {})
    return yield* next(e)
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const rest = await next(e) // the engine's hint line, and what other mods draw here
    if (!isBelow) return rest
    const drawn = await pillsFor($, e.surface, (e.viewport?.columns ?? FOOTER_COLUMNS) - FOOTER_MARGIN, isRound)
    if (!drawn) return rest
    const ui = $.ui.resolve(e)
    const { Box } = ui
    return (
      <Box flexDirection="column">
        {rest}
        {row(ui, drawn.pills, drawn.hasCaps, { marginTop: FOOTER_GAP_ROWS })}
      </Box>
    )
  })

  // Over the prompt, with `position: above`: above what the other mods draw.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e) // what other mods and Claude Code draw here stays
    if (isBelow || e.props.hasSurvey) return rest
    const drawn = await pillsFor($, e.surface, e.props.bodyColumns - 2, isRound)
    if (!drawn) return rest

    // Empty rows above, so the pills do not sit against the transcript: as many as a short band has room
    // for. The row between the pills and the prompt is the engine's (its notices draw there), not this tree's.
    const marginTop = Math.max(0, Math.min(GAP_ROWS, e.props.maxRows - 1))
    const elements = $.ui.resolve(e)
    const { Box } = elements
    const mine = row(elements, drawn.pills, drawn.hasCaps, { paddingX: 1, marginTop })
    return (
      <Box flexDirection="column">
        {mine}
        {rest}
      </Box>
    ) // above what other mods and Claude Code draw here, which `rest` carries
  })
}

// The pills that fit in `columns` cells, or undefined with nothing to show. Reading the
// tick and the snapshot here has the site drawn again when either changes.
async function pillsFor($: EngineInterface, surface: string, columns: number, isRound: boolean) {
  await read($, tick) // redraws on each tick of the countdown
  const snap = await read($, snapshot)
  if (!snap) return undefined
  const hasCaps = isRound && surface === 'terminal' // the glyphs are a terminal font's
  const pills = fit(build(snap, await $.clock.now()), columns, hasCaps)
  return pills.length > 0 ? { pills, hasCaps } : undefined
}

// One row of pills. With caps, a half circle opens the row and each pill ends in one of its
// own color, drawn over the next pill's; without, the pills sit side by side.
function row({ Box, Text }: Elements, pills: Pill[], hasCaps: boolean, layout: { paddingX?: number; marginTop?: number }): RenderElement {
  const cells: RenderNode[] = []
  pills.forEach((p, i) => {
    const after = pills[i + 1]
    if (hasCaps && i === 0) cells.push(<Text key="cap" color={p.bg}>{CAP_LEFT}</Text>)
    cells.push(
      <Text key={`pill-${i}`} color={p.fg} backgroundColor={p.bg} wrap="truncate">
        {` ${p.text} `}
      </Text>,
    )
    if (hasCaps) cells.push(<Text key={`cap-${i}`} color={p.bg} {...(after ? { backgroundColor: after.bg } : {})}>{CAP_RIGHT}</Text>)
  })
  return (
    <Box key="usage-meter" flexDirection="row" {...layout}>
      {cells}
    </Box>
  )
}

// The main loop's model as the engine names it (`claude-opus-5-5`, `opus`); undefined when it will not say.
async function currentModel($: EngineInterface) {
  return (await $.session.model().catch(() => '')) || undefined
}

// Keeps the level a main-loop request asked for; a number (a token budget) or none shows no effort.
async function noteEffort($: EngineInterface, effort: string | number | undefined) {
  const level = typeof effort === 'string' ? effort : undefined
  if ((await read($, snapshot))?.effort === level) return
  await update($, snapshot, s => (s ? { ...s, effort: level } : s))
}

async function take($: EngineInterface, context: Context | undefined, rateLimits: readonly UsageMeterWindow[]) {
  const windows = rateLimits
    .filter(w => Number.isFinite(w.percentUsed))
    .map(w => ({ kind: w.kind, percentUsed: w.percentUsed, resetsAt: w.resetsAt }))
  const model = await currentModel($)
  const contextPercent = context ? fill(context) : undefined
  await update($, snapshot, s => ({ model, effort: s?.effort, contextPercent, rateLimits: windows })) // the effort is turn.step's
  await warn($, windows)
}

// One toast per window per reset period, once it passes WARN_AT.
async function warn($: EngineInterface, windows: UsageMeterWindow[]) {
  const done = await read($, warned)
  const now = await $.clock.now()
  const fresh: Record<string, number> = {}
  const rearm: string[] = []
  for (const w of windows) {
    const resetMs = resetTime(w)
    if (w.percentUsed < WARN_AT) {
      // With no reset time, dropping back under the line is the only sign of a new period.
      if (resetMs === 0 && done[w.kind] !== undefined) rearm.push(w.kind)
      continue
    }
    const last = done[w.kind]
    // A reset time that moved on by more than half an hour is a new period.
    if (last !== undefined && resetMs <= last + 30 * 60_000) continue
    fresh[w.kind] = resetMs
    const when = resetMs > 0 ? `, resets in ${countdown(resetMs - now)}` : ''
    const what = w.kind === 'spend_limit' ? 'Spend limit' : `${label(w.kind)} usage limit`
    $.ui.toast(`${what} at ${Math.round(w.percentUsed)}%${when}`)
  }
  if (Object.keys(fresh).length > 0 || rearm.length > 0) {
    await update($, warned, old => {
      const next = { ...old, ...fresh }
      for (const kind of rearm) delete next[kind]
      return next
    })
  }
}

// The pills, left to right: the model, the context's fill, the first window and its reset
// countdown, then every other window that runs high.
export function build(snap: UsageMeterSnapshot, now: number): Pill[] {
  const pills: Pill[] = []
  if (snap.model) {
    const effort = snap.effort ? ` (${snap.effort})` : ''
    pills.push({ kind: 'model', text: `Model: ${modelName(snap.model)}${effort}`, ...colored(CYAN) })
  }
  if (snap.contextPercent !== undefined) {
    pills.push({ kind: 'context', text: `Ctx Used: ${percent(snap.contextPercent)}`, ...colored(TEXT) })
  }
  snap.rateLimits
    .filter(w => !isStale(w, now)) // a window past its reset waits for a fresh reading
    .sort((a, b) => rank(a.kind) - rank(b.kind))
    .forEach((w, i) => {
      const resetMs = resetTime(w)
      const left = resetMs > 0 ? countdown(resetMs - now) : ''
      if (i === 0) {
        // The first window is always there, blue until it runs high, with its countdown in a pill of its own.
        pills.push({ kind: 'window', text: `${title(w.kind)}: ${percent(w.percentUsed)}`, ...tone(w.percentUsed) })
        if (left) pills.push({ kind: 'reset', text: `Reset: ${left}`, ...colored(TEXT) })
      } else if (w.percentUsed >= HIGH_AT) {
        // The others only once they run high, so they are always amber or red.
        pills.push({ kind: 'extra', text: `${title(w.kind)}: ${percent(w.percentUsed)}${left ? ` · ${left}` : ''}`, ...tone(w.percentUsed) })
      }
    })
  return pills
}

// Drops pills until the row fits: the model first, then the context, the windows that
// only run high, and last the countdown. The first window always stays.
export function fit(pills: Pill[], columns: number, hasCaps = true): Pill[] {
  const kept = [...pills]
  for (const kind of ['model', 'context', 'extra', 'reset'] as const) {
    for (let i = kept.length - 1; i >= 0 && width(kept, hasCaps) > columns; i--) {
      if (kept[i]!.kind === kind) kept.splice(i, 1)
    }
  }
  return kept
}

// A pill is its text and a space on each side; with caps, one cell opens the row and one closes each pill.
function width(pills: Pill[], hasCaps: boolean) {
  const cells = pills.reduce((n, p) => n + [...p.text].length + 2 + (hasCaps ? 1 : 0), 0)
  return pills.length > 0 && hasCaps ? cells + 1 : cells
}

// The background and text colors of a window's pill.
export function tone(used: number) {
  if (used >= WARN_AT) return colored(RED)
  if (used >= HIGH_AT) return colored(AMBER)
  return colored(BLUE)
}

// A pill in `color`: the color as text, over the color faded into the theme's background.
function colored(color: string) {
  return { bg: tint(color, TINT), fg: color }
}

// `color` at `alpha` over the theme's background, as one opaque color: `#7aa2f7` at 0.25 -> `#323d5a`.
export function tint(color: string, alpha: number, under = INK) {
  const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  const top = rgb(color)
  const bottom = rgb(under)
  return `#${top.map((c, i) => Math.round(c * alpha + bottom[i]! * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`
}

// How full the context window is, 0 to 100: from the token count when there is one, so it
// carries a decimal; else the engine's whole percentage. Undefined before the first reading.
export function fill(context: Context) {
  if (context.tokens !== undefined && context.window > 0) return Math.min(100, (context.tokens / context.window) * 100)
  return context.percent
}

// `7` -> `7.0%`, `23.46` -> `23.5%`.
export function percent(value: number) {
  return `${Math.max(0, value).toFixed(1)}%`
}

// `claude-opus-5-5` -> `Opus 5.5`, `us.anthropic.claude-3-5-haiku-20241022-v1:0` -> `Haiku 3.5`,
// `opus[1m]` -> `Opus`; anything else as it came, cut short. From upstream's agent-radar.
export function modelName(id: string): string {
  const parts = id.toLowerCase().replace(/\[.*\]$/, '').split(/[-.:@_/]/)
  const family = parts.find(p => FAMILIES.includes(p))
  if (!family) {
    const last = id.split('/').at(-1) ?? id // an ARN's profile id, not its region and account
    return last.length > MODEL_MAX ? `${last.slice(0, MODEL_MAX - 1)}…` : last
  }
  const from = Math.max(0, parts.indexOf('claude')) // a version before `claude` is an ARN's region (us-east-1)
  const start = parts.findIndex((p, i) => i >= from && /^\d{1,2}$/.test(p))
  const version: string[] = []
  for (let i = start; i >= 0 && i < parts.length && version.length < 2 && /^\d{1,2}$/.test(parts[i]!); i++) version.push(parts[i]!)
  const name = family[0]!.toUpperCase() + family.slice(1)
  return version.length ? `${name} ${version.join('.')}` : name
}

export function countdown(ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h${String(minutes % 60).padStart(2, '0')}`
  return `${Math.floor(hours / 24)}d${hours % 24}h`
}

function resetTime(w: UsageMeterWindow) {
  const ms = w.resetsAt ? Date.parse(w.resetsAt) : NaN
  return Number.isFinite(ms) ? ms : 0
}

function isStale(w: UsageMeterWindow, now: number) {
  const resetMs = resetTime(w)
  return resetMs > 0 && resetMs <= now
}

function label(kind: string) {
  return LABELS[kind] ?? kind.replace(/_/g, ' ')
}

function title(kind: string) {
  return TITLES[kind] ?? kind.replace(/_/g, ' ')
}

function rank(kind: string) {
  const i = ORDER.indexOf(kind)
  return i < 0 ? ORDER.length : i
}
