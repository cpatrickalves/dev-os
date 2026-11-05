// Usage Meter: the model, the context window's fill and the plan's rate-limit windows above
// the prompt, as one row of powerline pills: "Model: Opus 5.5 | Ctx Used: 7.0% | Session: 50.0% | Reset: 19m".
//
// A Dev-OS fork of usage-meter 0.1.1 from https://github.com/hamzafer/claude-code-mods
// (commit 7e60143, MIT, see ../LICENSE). Upstream draws block bars and the session's cost;
// this one draws pills in the Tokyo Night colors and leaves the cost out. The readings, the countdown timer, the
// toasts past 90% and the band order (bands.ts, untouched) are upstream's.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderNode, Timer } from 'claude-code'

import type { UsageMeterSnapshot, UsageMeterWindow } from '../types'
import { bandsFile, parseOrder, stackBands } from './bands'

const TICK_MS = 60_000
const HIGH_AT = 75 // a window past this turns amber, and a secondary window shows up
const WARN_AT = 90 // past this it turns red and raises a toast
const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' } // in toasts
const TITLES: Record<string, string> = { five_hour: 'Session', seven_day: 'Week', spend_limit: 'Spend' } // in pills
const ORDER = ['five_hour', 'seven_day', 'spend_limit']
const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku']
const MODEL_MAX = 24

// Powerline half circles: they need a Nerd Font (or any powerline font) in the terminal.
const CAP_LEFT = ''
const CAP_RIGHT = ''

// The colors of Dev-OS's theme: Tokyo Night, as herdr/nightgrid/themes/tokyo-night.json and the
// nightgrid skin (configs/claude-skins) have them. The bright pills take the theme's background as text.
const INK = '#1a1b26' // background
const TEXT = '#c0caf5' // foreground
const CYAN = '#7dcfff'
const SLATE = '#414868' // bright black
const BLUE = '#7aa2f7' // accent
const PURPLE = '#bb9af7'
const AMBER = '#e0af68' // working
const RED = '#f7768e' // blocked

// Held by the host, so they survive a hot reload of this file.
const snapshot = atom({ plugin: 'usage-meter', key: 'snapshot' } as const, null as UsageMeterSnapshot | null)
const tick = atom({ plugin: 'usage-meter', key: 'tick' } as const, 0)
const warned = atom({ plugin: 'usage-meter', key: 'warned' } as const, {} as Record<string, number>)

type PillKind = 'model' | 'context' | 'window' | 'reset' | 'extra'
export type Pill = { kind: PillKind; text: string; bg: string; fg: string }
type Context = { tokens?: number; window: number; percent?: number }

let bandOrder: Promise<string[]> | undefined // read once per session: restart to apply

// The band order file, as the claude-code-mods checklist saves it; [] on any error.
async function readBandOrder($: EngineInterface): Promise<string[]> {
  const file = bandsFile(await $.env.get('CLAUDE_CONFIG_DIR'), await $.env.get('HOME'))
  return file && (await $.fs.exists(file)) ? parseOrder(await $.fs.read(file)) : []
}

// Forgets the cached band order, for tests.
export function resetBandOrder() {
  bandOrder = undefined
}

export const register: Register = (on, options) => {
  // userConfig.caps: 'none' draws flat pills, for a terminal font with no powerline glyphs.
  const isRound = String((options as Record<string, unknown>)?.caps ?? 'round').trim().toLowerCase() !== 'none'
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

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e) // what other mods and Claude Code draw here stays
    await read($, tick) // redraws on each tick of the countdown
    const snap = await read($, snapshot)
    if (e.props.hasSurvey || !snap) return rest

    const hasCaps = isRound && e.surface === 'terminal' // the glyphs are a terminal font's
    const pills = fit(build(snap, await $.clock.now()), e.props.bodyColumns - 2, hasCaps)
    if (pills.length === 0) return rest

    const { Box, Text } = $.ui.resolve(e)
    const cells: RenderNode[] = []
    pills.forEach((p, i) => {
      const after = pills[i + 1]
      if (hasCaps && i === 0) cells.push(<Text key="cap" color={p.bg}>{CAP_LEFT}</Text>)
      cells.push(
        <Text key={`pill-${i}`} color={p.fg} backgroundColor={p.bg} wrap="truncate">
          {` ${p.text} `}
        </Text>,
      )
      // Each pill ends in a half circle of its own color, drawn over the next pill's.
      if (hasCaps) cells.push(<Text key={`cap-${i}`} color={p.bg} {...(after ? { backgroundColor: after.bg } : {})}>{CAP_RIGHT}</Text>)
    })

    // One empty row above, so the pills do not sit against the transcript; a one-row band has no room for it.
    const mine = (
      <Box flexDirection="row" paddingX={1} marginTop={e.props.maxRows >= 2 ? 1 : 0}>
        {cells}
      </Box>
    )
    bandOrder ??= readBandOrder($).catch(() => [])
    return stackBands(rest, 'usage-meter', mine, 'above', await bandOrder) // above what other mods draw, unless the band order says otherwise
  })
}

// The main loop's model as the engine names it (`claude-opus-5-5`, `opus`); undefined when it will not say.
async function currentModel($: EngineInterface) {
  return (await $.session.model().catch(() => '')) || undefined
}

async function take($: EngineInterface, context: Context | undefined, rateLimits: readonly UsageMeterWindow[]) {
  const windows = rateLimits
    .filter(w => Number.isFinite(w.percentUsed))
    .map(w => ({ kind: w.kind, percentUsed: w.percentUsed, resetsAt: w.resetsAt }))
  const model = await currentModel($)
  const contextPercent = context ? fill(context) : undefined
  await update($, snapshot, () => ({ model, contextPercent, rateLimits: windows }))
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
  if (snap.model) pills.push({ kind: 'model', text: `Model: ${modelName(snap.model)}`, bg: CYAN, fg: INK })
  if (snap.contextPercent !== undefined) {
    pills.push({ kind: 'context', text: `Ctx Used: ${percent(snap.contextPercent)}`, bg: SLATE, fg: TEXT })
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
        if (left) pills.push({ kind: 'reset', text: `Reset: ${left}`, bg: PURPLE, fg: INK })
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
  if (used >= WARN_AT) return { bg: RED, fg: INK }
  if (used >= HIGH_AT) return { bg: AMBER, fg: INK }
  return { bg: BLUE, fg: INK }
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
