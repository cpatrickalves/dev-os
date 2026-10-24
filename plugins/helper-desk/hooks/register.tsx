import type { EngineInterface, Register } from 'claude-code'

import type { BandPlan, Helper, HelperPhase, PlanStatus, Step, StepKind } from '../types'
import { connectorName, splitTool } from './connectors'

const NAME = 'helper-desk'
const PANE = 'helpers'
// The name a person reads; the plugin and its /helpers command keep their old names.
const TITLE = 'Helper Desk'
const HELPERS = { plugin: 'helper-desk', key: 'helpers' } as const
const CLOCK = { plugin: 'helper-desk', key: 'clock' } as const
const VIEW = { plugin: 'helper-desk', key: 'view' } as const
const COST = { plugin: 'helper-desk', key: 'cost' } as const
const OFF = { plugin: 'helper-desk', key: 'off' } as const
const HIDDEN = { plugin: 'helper-desk', key: 'hidden' } as const
const PLAN = { plugin: 'helper-desk', key: 'plan' } as const
const SHIM = { plugin: 'helper-desk', key: 'shimmer' } as const

const TICK_MS = 300
const POLL_MS = 2000
const SWITCH_MS = 3000
const HISTORY = 3
const MAX_STEPS = 200
const TAG_W = 11
// Columns the pet takes beside a card; the Svg is 48 by 36 CSS pixels.
const PET_W = 8
const PET_PX_W = 48
const PET_PX_H = 36
// A running pet changes frame every second tick: about every 600 ms.
const FRAME_TICKS = 2

const ACCENT = '#d97757'
const GOOD = '#16a34a'
const BAD = '#dc2626'
const WARN = '#eab308'
const INK = '#1c1917'
// The task bar is a purple gradient, light at the start and deep at the head (after Johnny's Savvy Progress).
const P_LIGHT = '#c4b5fd'
const P_MID = '#8b5cf6'
const P_DEEP = '#6d28d9'
// Quarter circles read clearly on desktop fonts and in the terminal.
const SPIN = ['◐', '◓', '◑', '◒']
const PULSE = ['●∙∙', '∙●∙', '∙∙●', '∙●∙']

const KIND_COLOR: Record<StepKind, string> = {
  Command: '#ca8a04',
  Connector: '#2563eb',
  'File read': '#16a34a',
  'File write': '#d97757',
  Skill: '#9333ea',
  Web: '#0891b2',
  Subagent: '#db2777',
  Tool: '#78716c',
}

// ---------- Pets: a pixel Claude crab, one body colour per helper ----------

type Px = [x: number, y: number]

// Eight body colours that are easy to tell apart and read on light and dark.
const HUES: { name: string; color: string }[] = [
  { name: 'red', color: '#dc2626' },
  { name: 'orange', color: '#ea580c' },
  { name: 'yellow', color: '#eab308' },
  { name: 'green', color: '#16a34a' },
  { name: 'teal', color: '#0d9488' },
  { name: 'blue', color: '#2563eb' },
  { name: 'purple', color: '#9333ea' },
  { name: 'pink', color: '#db2777' },
]
const hueOf = (hue: number) => HUES[((hue % HUES.length) + HUES.length) % HUES.length]!

// Eyes and outline are the same on every pet.
const EYE = '#2b1d16'
const OUTLINE = '#2b1d16'
const FRAMES = 4

const span = (y: number, from: number, to: number): Px[] => Array.from({ length: to - from + 1 }, (_, i) => [from + i, y] as Px)

/**
 * One frame of the crab on a 16 by 12 grid. Frame 0 stands; 1 hops up a pixel with
 * its legs moved; 2 stands and blinks; 3 raises both claws.
 */
function crab(frame: number): { body: Px[]; eyes: Px[] } {
  const dy = frame === 1 ? 0 : 1
  const clawsUp = frame === 3
  const body: Px[] = [
    ...span(1, 3, 12),
    ...span(2, 3, 12),
    ...span(3, 3, 12),
    ...(clawsUp ? span(4, 3, 12) : span(4, 1, 14)),
    ...(clawsUp ? span(5, 3, 12) : span(5, 1, 14)),
    ...span(6, 3, 12),
    ...span(7, 3, 12),
  ]
  if (clawsUp) body.push([1, 2], [2, 2], [1, 3], [2, 3], [13, 2], [14, 2], [13, 3], [14, 3])
  const legs = frame % 2 === 1 ? [3, 5, 10, 12] : [4, 6, 9, 11]
  for (const x of legs) body.push([x, 8], [x, 9])
  const eyes: Px[] = frame === 2 ? [[5, 4], [10, 4]] : [[5, 3], [5, 4], [10, 3], [10, 4]]
  const move = (p: Px): Px => [p[0], p[1] + dy]
  return { body: body.map(move), eyes: eyes.map(move) }
}

const petCache = new Map<string, string>()

function petSvg(hue: number, frame: number) {
  const key = `${hue % HUES.length}:${frame}`
  const hit = petCache.get(key)
  if (hit) return hit
  const { body, eyes } = crab(frame)
  const fill = hueOf(hue).color
  const has = new Set(body.map(([x, y]) => `${x},${y}`))
  // A one-pixel outline round the body, so every colour reads on light and dark.
  const ring = new Set<string>()
  for (const [x, y] of body) {
    for (const [ax, ay] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Px[]) {
      const k = `${ax},${ay}`
      if (!has.has(k)) ring.add(k)
    }
  }
  const rect = (x: number, y: number, c: string) => `<rect x="${x + 1}" y="${y + 1}" width="1" height="1" fill="${c}"/>`
  const parts = [
    ...[...ring].map(k => {
      const [x, y] = k.split(',').map(Number)
      return rect(x!, y!, OUTLINE)
    }),
    ...body.map(([x, y]) => rect(x, y, fill)),
    ...eyes.map(([x, y]) => rect(x, y, EYE)),
  ]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 13" width="${PET_PX_W}" height="${PET_PX_H}" shape-rendering="crispEdges">${parts.join('')}</svg>`
  petCache.set(key, svg)
  return svg
}

// ---------- The desk itself; $.state carries a copy for the pane to draw ----------

let helpers: Helper[] = []
let seats = 0
// The next body colour to hand out, in HUES order.
let nextHue = 0
let tickN = 0
let home = ''
let sessionId = ''
let off = false
// "helper-desk:hidden": true in switches.json closes the pane and stops it opening by itself.
let hidden = false
let ticker: { cancel: () => void } | null = null
let poller: { cancel: () => void } | null = null
let switcher: { cancel: () => void } | null = null
const strangers = new Set<string>()

function toolWords(tool: string, connector: string) {
  const words = tool
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w.toLowerCase())
  // "slack_search_public" from Slack reads "Slack · search public".
  if (words.length > 1 && words[0] === connector.split(' ')[0]!.toLowerCase()) words.shift()
  return words.join(' ')
}

const base = (p: string) => p.split('/').filter(Boolean).pop() ?? p
const cut = (t: string, n: number) => (n <= 0 ? '' : t.length > n ? `${t.slice(0, Math.max(0, n - 1))}…` : t)
const oneLine = (t: string) => t.replace(/\s+/g, ' ').trim()

function folder(p: string) {
  const parts = p.split('/')
  parts.pop()
  const dir = parts.join('/')
  return home && dir.startsWith(home) ? `~${dir.slice(home.length)}` : dir
}

/** One tool call: its kind, a short label for the list, and plain words for the live line. */
function describe(tool: string, args: Record<string, unknown>): Step {
  const s = (k: string) => (typeof args[k] === 'string' ? oneLine(args[k] as string) : '')
  const file = (verb: string, kind: StepKind, key = 'file_path'): Step => {
    const p = typeof args[key] === 'string' ? (args[key] as string) : ''
    const name = base(p) || 'a file'
    return { kind, label: name, dim: p ? folder(p) : '', live: `${verb} ${name}` }
  }
  if (tool.startsWith('mcp__')) {
    const { server, name: toolName } = splitTool(tool)
    const name = connectorName(server, toolName)
    const words = toolWords(toolName.replace(/__/g, '_'), name)
    return { kind: 'Connector', label: `${name} · ${words}`, dim: '', live: `${name}: ${words}` }
  }
  switch (tool) {
    case 'Read':
      return file('Reading', 'File read')
    case 'Write':
      return file('Writing', 'File write')
    case 'Edit':
    case 'MultiEdit':
      return file('Editing', 'File write')
    case 'NotebookEdit':
      return file('Editing', 'File write', 'notebook_path')
    case 'Grep':
    case 'Glob': {
      const pat = s('pattern')
      const p = s('path')
      return {
        kind: 'File read',
        label: pat ? `Search "${cut(pat, 60)}"` : 'Search files',
        dim: p ? (home && p.startsWith(home) ? `~${p.slice(home.length)}` : p) : '',
        live: pat ? `Searching files for "${cut(pat, 40)}"` : 'Searching files',
      }
    }
    case 'Bash': {
      const label = s('description') || cut(s('command'), 80) || 'a command'
      return { kind: 'Command', label, dim: '', live: `Running: ${label}` }
    }
    case 'WebSearch':
      return { kind: 'Web', label: s('query') || 'web search', dim: '', live: `Searching the web: ${s('query')}` }
    case 'WebFetch': {
      let host = 'a web page'
      try {
        host = new URL(s('url')).host
      } catch {
        // Not a URL: keep the plain words.
      }
      return { kind: 'Web', label: host, dim: '', live: `Opening ${host}` }
    }
    case 'Skill':
      return { kind: 'Skill', label: s('skill') || 'a skill', dim: '', live: `Using the ${s('skill') || 'a'} skill` }
    case 'Agent':
    case 'Task':
      return {
        kind: 'Subagent',
        label: s('description') || 'Start a subagent',
        dim: '',
        live: s('description') ? `Starting a subagent: ${s('description')}` : 'Starting a subagent',
      }
    case 'SendMessage':
      return { kind: 'Subagent', label: 'Send a message', dim: '', live: 'Sending a message' }
    case 'TodoWrite':
      return { kind: 'Tool', label: 'Update its to-do list', dim: '', live: 'Updating its to-do list' }
    case 'ToolSearch':
      return { kind: 'Tool', label: 'Load tools', dim: '', live: 'Loading tools' }
    default:
      return { kind: 'Tool', label: tool, dim: '', live: `Using ${tool}` }
  }
}

function clockTime(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

function tokenText(n: number) {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

/** "claude-opus-5-5" reads "Opus 5.5"; "haiku" reads "Haiku". */
function shortModel(model: string) {
  const hit = /(opus|sonnet|haiku|fable)(?:[-_ ](\d+))?(?:[-_.](\d+))?/i.exec(model)
  if (!hit) return model
  const fam = hit[1]![0]!.toUpperCase() + hit[1]!.slice(1).toLowerCase()
  return hit[2] ? `${fam} ${hit[2]}${hit[3] ? `.${hit[3]}` : ''}` : fam
}

type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
const usageTotal = (u: Usage) => u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens

const working = () => helpers.filter(hp => hp.phase === 'working').length

/** The next colour in order that no running helper wears; with all 8 taken, the next in order. */
function pickHue() {
  const used = new Set(helpers.filter(hp => hp.phase === 'working').map(hp => hp.hue % HUES.length))
  let hue = nextHue % HUES.length
  for (let i = 0; i < HUES.length; i += 1) {
    const h = (nextHue + i) % HUES.length
    if (!used.has(h)) {
      hue = h
      break
    }
  }
  nextHue = hue + 1
  return hue
}
const copy = (hp: Helper): Helper => ({ ...hp, steps: hp.steps.map(st => ({ ...st })) })

async function log($: EngineInterface, line: string) {
  try {
    const dir = `${home}/.claude/mods-logs`
    const path = `${dir}/${NAME}.log`
    let old = ''
    if (await $.fs.exists(path).catch(() => false)) old = String(await $.fs.read(path))
    else await $.process.run(['mkdir', '-p', dir])
    await $.fs.write(path, `${old}${new Date().toISOString()} ${line}\n`)
  } catch {
    // Logging must never break the session.
  }
}

async function tick($: EngineInterface) {
  tickN += 1
  await $.state.set(CLOCK, { tick: tickN, now: await $.clock.now() })
}

async function readCost($: EngineInterface) {
  try {
    const u = await $.session.usage()
    await $.state.set(COST, { usd: typeof u.cost?.usd === 'number' ? u.cost.usd : null })
  } catch {
    // No ledger here: the tile stays hidden.
  }
}

async function poll($: EngineInterface) {
  if (!working()) return
  const list = await $.agent.list()
  const now = await $.clock.now()
  let changed = false
  for (const a of list) {
    const hp = helpers.find(x => x.id === a.id)
    if (!hp || hp.phase !== 'working') continue
    // The list may lag a turn's end; it only ever moves a card out of working.
    const next: HelperPhase | null =
      a.status === 'completed' || a.status === 'idle' ? 'done' : a.status === 'failed' || a.status === 'killed' ? 'failed' : null
    if (next) {
      hp.phase = next
      hp.endedAt = now
      changed = true
    }
    if (!hp.description && a.description) {
      hp.description = a.description
      changed = true
    }
  }
  if (changed) await publish($)
  else await readCost($)
}

function syncTimers($: EngineInterface) {
  if (working() && !off) {
    ticker ??= $.clock.every(TICK_MS, () => {
      void tick($).catch(() => undefined)
    })
    poller ??= $.clock.every(POLL_MS, () => {
      void poll($).catch(err => log($, `poll: ${String(err)}`))
    })
  } else {
    ticker?.cancel()
    poller?.cancel()
    ticker = null
    poller = null
  }
}

async function publish($: EngineInterface) {
  await $.state.set(HELPERS, helpers.map(copy))
  await $.state.set(CLOCK, { tick: tickN, now: await $.clock.now() })
  await readCost($)
  // No status line: on desktop it drew over Context Meter's footer bar. The pane shows the count.
  $.ui.status(undefined)
  syncTimers($)
}

async function addHelper($: EngineInterface, id: string, description: string, type: string, model: string) {
  const known = helpers.find(hp => hp.id === id)
  if (known) {
    // Found first through its own tool calls: fill in what the spawn knows.
    if (description) known.description = description
    if (type) known.type = type
    if (model && !known.model) known.model = model
    await publish($)
    return
  }
  const wasIdle = working() === 0
  const now = await $.clock.now()
  helpers.push({
    id,
    description: description || 'Subagent',
    type: type || 'subagent',
    model,
    effort: '',
    phase: 'working',
    startedAt: now,
    endedAt: 0,
    count: 0,
    steps: [],
    tokens: 0,
    turnTokens: 0,
    hasUsage: false,
    seat: seats,
    hue: pickHue(),
  })
  seats += 1
  await publish($)
  // The pane opens by itself when a new round of helpers starts.
  if (wasIdle && !hidden) void $.ui.open({ id: PANE, title: TITLE }).catch(err => log($, `open: ${String(err)}`))
}

/** A loop whose spawn this mod missed (a reload, a race): take it from $.agent.list(). */
async function adopt($: EngineInterface, id: string) {
  if (helpers.some(hp => hp.id === id) || strangers.has(id)) return
  const a = (await $.agent.list()).find(x => x.id === id)
  if (!a) {
    // The engine's own forks carry ids no list names: leave them out.
    strangers.add(id)
    return
  }
  await addHelper($, id, a.description, a.type, '')
}

async function noteTool($: EngineInterface, id: string, step: Step) {
  if (!helpers.some(x => x.id === id)) await adopt($, id)
  const hp = helpers.find(x => x.id === id)
  if (!hp) return
  hp.count += 1
  hp.steps = [...hp.steps, step].slice(-MAX_STEPS)
  // A teammate that finished a turn and picks up work again is working again.
  if (hp.phase !== 'working') {
    hp.phase = 'working'
    hp.endedAt = 0
  }
  await publish($)
}

async function noteStep($: EngineInterface, id: string, model: string, effort: string, usage: Usage | null) {
  if (!helpers.some(x => x.id === id)) await adopt($, id)
  const hp = helpers.find(x => x.id === id)
  if (!hp) return
  if (model) hp.model = shortModel(model)
  if (effort) hp.effort = effort
  if (usage) {
    hp.turnTokens += usageTotal(usage)
    hp.hasUsage = true
  }
  await publish($)
}

async function finish($: EngineInterface, id: string, phase: HelperPhase, usage: Usage | null) {
  const hp = helpers.find(x => x.id === id)
  if (!hp) return
  // The turn's own sum wins over the steps counted so far.
  hp.tokens += usage ? usageTotal(usage) : hp.turnTokens
  hp.turnTokens = 0
  if (usage) hp.hasUsage = true
  hp.phase = phase
  hp.endedAt = await $.clock.now()
  await publish($)
}

async function setOff($: EngineInterface, value: boolean) {
  if (value === off) return
  off = value
  await $.state.set(OFF, off)
  if (off) {
    $.ui.status(undefined)
    await $.ui.close({ id: PANE }).catch(() => undefined)
  }
  syncTimers($)
  syncShimmer($)
}

const HIDE_KEY = `${NAME}:hidden`
const switchesPath = () => `${home}/.claude/mods/switches.json`

async function readSwitches($: EngineInterface): Promise<Record<string, unknown>> {
  if (!(await $.fs.exists(switchesPath()))) return {}
  const json = JSON.parse(String(await $.fs.read(switchesPath()))) as unknown
  return json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : {}
}

async function readSwitch($: EngineInterface) {
  try {
    const json = await readSwitches($)
    const nowHidden = json[`${NAME}:hidden`] === true
    if (nowHidden && !hidden) await $.ui.close({ id: PANE }).catch(() => undefined)
    if (nowHidden !== hidden) {
      hidden = nowHidden
      // The band reads this key, so a change redraws it.
      await $.state.set(HIDDEN, hidden)
      syncShimmer($)
    }
    await setOff($, json[NAME] === false)
  } catch {
    // A broken file never turns the mod off.
  }
}

// Read, change, write the whole file, so every chat sees the choice within 3 s.
async function setHidden($: EngineInterface, value: boolean) {
  try {
    const json = await readSwitches($)
    if (value) json[HIDE_KEY] = true
    else delete json[HIDE_KEY]
    await $.process.run(['mkdir', '-p', `${home}/.claude/mods`])
    await $.fs.write(switchesPath(), `${JSON.stringify(json, null, 2)}\n`)
  } catch (err) {
    await log($, `save hidden: ${String(err)}`)
  }
  hidden = value
  await $.state.set(HIDDEN, hidden)
  syncShimmer($)
  if (value) await $.ui.close({ id: PANE }).catch(() => undefined)
}

async function openPane($: EngineInterface) {
  await $.ui.open({ id: PANE, title: TITLE })
}

async function checkOpen($: EngineInterface) {
  if (!sessionId) return
  const path = `${home}/.claude/mods/.open-${NAME}-${sessionId}`
  if (!(await $.fs.exists(path).catch(() => false))) return
  await $.process.run(['rm', '-f', path])
  if (!off) await openPane($)
}

async function switchPoll($: EngineInterface) {
  await readSwitch($)
  await checkOpen($).catch(err => log($, `open request: ${String(err)}`))
}

// ---------- The plan: one list per chat, shared with chat-inventory through a file ----------

const PLAN_TOOL = 'mcp__helper-desk__plan'
const MIRRORED = new Set(['TodoWrite', 'TaskCreate', 'TaskUpdate'])
const PLAN_PROMPT =
  'The mcp__helper-desk__plan tool shows a to-do list as a progress bar the user watches. ' +
  'TodoWrite, TaskCreate and TaskUpdate feed the same bar, so if you already track the task with them, keep using them and do not keep two lists. ' +
  'Use a list when the task has several distinct steps the user would want to follow, for example: opening a PR (sync the branch, run lint and tests, write the description, create it), ' +
  'implementing a feature with parts to build, a migration, a release, or fixing a bug that needs a reproduction, a fix and a check. ' +
  'Answering a question, investigating or reading code, or a small edit needs no list, however many tool calls it takes; never add a list just to fill the bar. ' +
  'When you do keep one, send the full list each time a step finishes or a new one starts, and mark the last step completed before your final answer. ' +
  'A step that launches subagents is one step.'
// Main-chat tool calls in a turn before the nudge to make a plan; short tasks never see it.
const NUDGE_AFTER = 3
// Tool calls since the last plan update before the nudge to tick it.
const STALE_AFTER = 8
const NUDGE_NEW =
  'Helper Desk: no to-do list for this task. If it has several distinct steps the user would want to follow, save them with mcp__helper-desk__plan or TaskCreate. Otherwise ignore this.'
const NUDGE_CONT =
  'Helper Desk: the to-do list has not changed this turn. If this is a new task with several distinct steps, save its steps; if it carries on the last one, update the list. Otherwise ignore this.'
const NUDGE_STALE =
  'Helper Desk: the to-do list has not changed in a while. If a step finished, update it with mcp__helper-desk__plan or TaskUpdate.'
const STATUSES: readonly PlanStatus[] = ['pending', 'in_progress', 'completed']
const SHIMMER_MS = 350
// How long a finished plan stays at 100% before the band goes away.
const DONE_HOLD_MS = 20_000
const BAR_FALLBACK = 30

type PlanStep = { text: string; status: PlanStatus; doneAt?: string; id?: string }
type Plan = { title: string; steps: PlanStep[]; updatedAt: string }
type StepIn = { text: string; status: PlanStatus; id?: string }

let plan: Plan | null = null
// True once every step is done; a list with work left in it starts the next plan.
let planDone = false
let planShown = false
let shimmer: { cancel: () => void } | null = null
let holdTimer: { cancel: () => void } | null = null
let shimN = 0
// The plan nudge: main-chat tool calls this turn, and whether a plan came in.
let turnCalls = 0
let turnPlanned = false
let nudged = false
let sincePlan = 0
let staleNudged = false

// A short reminder after a tool's result, read by the model only.
function withNudge<R>(r: R): R {
  turnCalls++
  sincePlan++
  const live = !!plan && !planDone && plan.steps.length > 0
  let note: string | null = null
  if (!turnPlanned && !nudged && turnCalls >= NUDGE_AFTER) {
    nudged = true
    note = live ? NUDGE_CONT : NUDGE_NEW
  } else if (live && !staleNudged && sincePlan >= STALE_AFTER) {
    staleNudged = true
    note = NUDGE_STALE
  }
  if (!note || !r || typeof r !== 'object' || 'deny' in (r as object)) return r
  const had = (r as { context?: readonly string[] }).context ?? []
  return { ...r, context: [...had, note] }
}
let stateDirMade = false

const planPath = () => `${home}/.claude/mods-state/plan-${sessionId}.json`
const doneCount = (steps: { status: PlanStatus }[]) => steps.filter(st => st.status === 'completed').length
const isStatus = (v: unknown): v is PlanStatus => typeof v === 'string' && (STATUSES as readonly string[]).includes(v)

async function writePlan($: EngineInterface) {
  if (!plan || !sessionId || !home) return
  try {
    if (!stateDirMade) {
      await $.process.run(['mkdir', '-p', `${home}/.claude/mods-state`])
      stateDirMade = true
    }
    const body = {
      title: plan.title,
      steps: plan.steps.map(st => ({ text: st.text, status: st.status, ...(st.doneAt ? { doneAt: st.doneAt } : {}) })),
      updatedAt: plan.updatedAt,
    }
    await $.fs.write(planPath(), `${JSON.stringify(body, null, 2)}\n`)
  } catch (err) {
    await log($, `write plan: ${String(err)}`)
  }
}

async function drawPlan($: EngineInterface) {
  const value: BandPlan | null = plan
    ? { title: plan.title, steps: plan.steps.map(st => ({ text: st.text, status: st.status })), shown: planShown }
    : null
  await $.state.set(PLAN, value)
  syncShimmer($)
}

/** The shimmer clock runs only while a shown plan has a step in progress. */
function syncShimmer($: EngineInterface) {
  const need = !off && !hidden && planShown && !!plan?.steps.some(st => st.status === 'in_progress')
  if (need) {
    shimmer ??= $.clock.every(SHIMMER_MS, () => {
      shimN += 1
      void $.state.set(SHIM, shimN).catch(() => undefined)
    })
  } else {
    shimmer?.cancel()
    shimmer = null
  }
}

function say($: EngineInterface, text: string) {
  try {
    $.ui.toast(cut(text, 140))
  } catch {
    // A toast is only a hint.
  }
}

/** Takes a whole new list, keeps done times, toasts what just finished, and saves. */
async function applyPlan($: EngineInterface, title: string | undefined, incoming: StepIn[]) {
  const now = new Date(await $.clock.now()).toISOString()
  const allDone = incoming.length > 0 && incoming.every(st => st.status === 'completed')
  // A list with work left in it after a finished plan is a new plan.
  const fresh = !plan || (planDone && !allDone)
  const old = fresh ? [] : plan!.steps
  const used = new Set<number>()
  const match = (st: StepIn) => {
    const i = old.findIndex((o, k) => !used.has(k) && (st.id ? o.id === st.id : o.text === st.text))
    if (i >= 0) used.add(i)
    return i >= 0 ? old[i] : undefined
  }
  const justDone: string[] = []
  const steps: PlanStep[] = incoming.map(st => {
    const was = match(st)
    const step: PlanStep = { text: st.text, status: st.status, ...(st.id ? { id: st.id } : {}) }
    if (st.status === 'completed') {
      step.doneAt = was?.status === 'completed' && was.doneAt ? was.doneAt : now
      if (was?.status !== 'completed' && !fresh) justDone.push(st.text)
    }
    return step
  })
  const wasDone = planDone && !fresh
  plan = { title: title?.trim() || (fresh ? 'Plan' : plan!.title), steps, updatedAt: now }
  planDone = allDone
  if (!steps.length) planShown = false
  else if (allDone && !wasDone) {
    planShown = true
    say($, steps.length === 1 ? 'All steps done.' : `All ${steps.length} steps done.`)
    holdTimer?.cancel()
    holdTimer = $.clock.after(DONE_HOLD_MS, () => {
      holdTimer = null
      planShown = false
      void drawPlan($).catch(err => log($, `hide plan: ${String(err)}`))
    })
  } else if (!allDone) {
    planShown = true
    holdTimer?.cancel()
    holdTimer = null
    if (justDone.length) say($, `Done: ${justDone.join(', ')}`)
  }
  await writePlan($)
  await drawPlan($)
}

/** The plan tool's own call: check the input, save it, answer in one line. */
async function planFromTool($: EngineInterface, args: Record<string, unknown>) {
  const raw = args.steps
  if (!Array.isArray(raw)) return 'Plan not saved: send steps as a list of { text, status }.'
  const steps: StepIn[] = []
  for (const st of raw as unknown[]) {
    const o = (st && typeof st === 'object' ? st : {}) as Record<string, unknown>
    const text = typeof o.text === 'string' ? oneLine(o.text) : ''
    if (!text) return 'Plan not saved: every step needs its text.'
    if (!isStatus(o.status)) return `Plan not saved: "${cut(text, 40)}" needs a status of pending, in_progress or completed.`
    steps.push({ text, status: o.status })
  }
  await applyPlan($, typeof args.title === 'string' ? oneLine(args.title) : undefined, steps)
  return `Plan saved: ${doneCount(steps)} of ${steps.length} steps done.`
}

/** TodoWrite, TaskCreate and TaskUpdate on the main chat feed the same plan. */
async function mirror($: EngineInterface, tool: string, args: Record<string, unknown>, r: unknown) {
  const res = (r as { result?: unknown; isError?: boolean; deny?: string } | undefined) ?? {}
  if (res.deny || res.isError) return
  if (tool === 'TodoWrite') {
    const todos = Array.isArray(args.todos) ? (args.todos as unknown[]) : []
    const steps: StepIn[] = []
    for (const t of todos) {
      const o = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>
      const text = typeof o.content === 'string' ? oneLine(o.content) : ''
      if (text) steps.push({ text, status: isStatus(o.status) ? o.status : 'pending' })
    }
    await applyPlan($, undefined, steps)
    return
  }
  const current: StepIn[] = plan && !planDone ? plan.steps.map(st => ({ text: st.text, status: st.status, ...(st.id ? { id: st.id } : {}) })) : []
  if (tool === 'TaskCreate') {
    const text = typeof args.subject === 'string' ? oneLine(args.subject) : ''
    if (!text) return
    const out = (res.result ?? {}) as { task?: { id?: unknown } }
    const id = typeof out.task?.id === 'string' ? out.task.id : undefined
    await applyPlan($, undefined, [...current, { text, status: 'pending', ...(id ? { id } : {}) }])
    return
  }
  // TaskUpdate: find the task by its id; an unknown one with a subject joins the list.
  const id = typeof args.taskId === 'string' ? args.taskId : ''
  const all: StepIn[] = plan ? plan.steps.map(st => ({ text: st.text, status: st.status, ...(st.id ? { id: st.id } : {}) })) : []
  const i = all.findIndex(st => st.id === id)
  const subject = typeof args.subject === 'string' ? oneLine(args.subject) : ''
  if (args.status === 'deleted') {
    if (i >= 0) await applyPlan($, undefined, all.filter((_, k) => k !== i))
    return
  }
  const status = isStatus(args.status) ? args.status : undefined
  if (i < 0) {
    if (subject) await applyPlan($, undefined, [...current, { text: subject, status: status ?? 'pending', id }])
    return
  }
  all[i] = { ...all[i]!, ...(subject ? { text: subject } : {}), ...(status ? { status } : {}) }
  await applyPlan($, undefined, all)
}

/** A reload or resume carries on with the plan this chat already saved. */
async function loadPlan($: EngineInterface) {
  if (plan || !sessionId || !home) return
  try {
    if (!(await $.fs.exists(planPath()))) return
    const json = JSON.parse(String(await $.fs.read(planPath()))) as { title?: unknown; steps?: unknown; updatedAt?: unknown }
    const steps: PlanStep[] = (Array.isArray(json.steps) ? (json.steps as Record<string, unknown>[]) : [])
      .filter(st => st && typeof st.text === 'string' && isStatus(st.status))
      .map(st => ({ text: String(st.text), status: st.status as PlanStatus, ...(typeof st.doneAt === 'string' ? { doneAt: st.doneAt } : {}) }))
    plan = {
      title: typeof json.title === 'string' && json.title ? json.title : 'Plan',
      steps,
      updatedAt: typeof json.updatedAt === 'string' ? json.updatedAt : '',
    }
    planDone = steps.length > 0 && steps.every(st => st.status === 'completed')
    planShown = steps.length > 0 && !planDone
    await drawPlan($)
  } catch (err) {
    await log($, `load plan: ${String(err)}`)
  }
}

async function toggleIn($: EngineInterface, field: 'open' | 'folded', id: string) {
  const { value = { open: [], folded: [] } } = await $.state.get(VIEW)
  const list = value[field]
  const nextList = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
  await $.state.set(VIEW, { ...value, [field]: nextList })
}

// ---------- Drawing ----------

/** A label then dim text, both cut to fit `w` cells; the folder gives way first. */
function fitRow(label: string, dim: string, w: number): [string, string] {
  if (label.length >= w || !dim) return [cut(label, w), '']
  const room = w - label.length - 2
  if (room < 4) return [label, '']
  return [label, dim.length > room ? `…${dim.slice(-(room - 1))}` : dim]
}

/** The terminal bar: one thick row of blocks, full when over, a sliding piece while working. */
function barParts(phase: HelperPhase, w: number, tick: number, seat: number): [string, string, string] {
  if (phase !== 'working') return ['', '█'.repeat(w), '']
  const piece = Math.max(3, Math.floor(w / 4))
  const span = w + piece
  const head = ((tick + seat * 5 + piece) % span) - piece
  const from = Math.max(0, head)
  const to = Math.min(w, head + piece)
  return ['░'.repeat(from), '█'.repeat(Math.max(0, to - from)), '░'.repeat(w - Math.max(from, to))]
}

// ---------- Sparkle bars: SVG for the desktop ----------

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"
const CELL = 3

// Fixed noise, so the sparkles sit still between redraws and only their CSS twinkle moves.
const noise = (x: number, y: number) => {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return v - Math.floor(v)
}
const xml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
// A rough width of system UI text, enough to place the bar after the title.
const textPx = (s: string, size: number) => [...s].reduce((n, ch) => n + (/[\s.,:;'|!il1()[\]]/.test(ch) ? 0.3 : /[A-Zmw@%]/.test(ch) ? 0.72 : 0.56) * size, 0)
const fitPx = (s: string, size: number, max: number) => {
  if (textPx(s, size) <= max) return s
  let out = ''
  for (const ch of s) {
    if (textPx(`${out}${ch}…`, size) > max) break
    out += ch
  }
  return `${out}…`
}

/** Twinkle classes s0 to s3, out of phase; `slow` for a finished bar. */
const twinkleCss = (slow: boolean) =>
  `.s0,.s1,.s2,.s3{animation:tw ${slow ? 3.2 : 2.1}s ease-in-out infinite}` +
  `.s1{animation-duration:${slow ? 3.8 : 2.7}s;animation-delay:-.7s}.s2{animation-duration:${slow ? 4.4 : 1.8}s;animation-delay:-1.3s}` +
  `.s3{animation-duration:${slow ? 3.5 : 3.1}s;animation-delay:-.4s}` +
  `@keyframes tw{0%,100%{opacity:.95}50%{opacity:${slow ? 0.55 : 0.15}}}`

/** Dither squares over `w` by `h` pixels: sparse at the left, dense at the right. */
function sparkles(w: number, h: number, size: number, base: number, rise: number, salt = 0): string {
  const cols = Math.floor(w / CELL)
  const rows = Math.max(1, Math.floor(h / CELL))
  const out: string[] = []
  for (let c = 0; c < cols; c++) {
    const density = base + rise * Math.pow(c / Math.max(1, cols), 1.3)
    for (let r = 0; r < rows; r++) {
      if (noise(c + salt, r) < density) {
        out.push(`<rect class="s${Math.floor(noise(r, c + salt) * 4)}" x="${c * CELL + 0.5}" y="${r * CELL + (h - rows * CELL) / 2 + 0.5}" width="${size}" height="${size}"/>`)
      }
    }
  }
  return out.join('')
}

/** A colour between `a` and `b`, both #rrggbb; `t` from 0 to 1. */
function mix(a: string, b: string, t: number): string {
  const at = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map(i => Math.round(at(a, i) + (at(b, i) - at(a, i)) * t).toString(16).padStart(2, '0')).join('')}`
}

const BAND_H = 24
const TRACK_H = 14

/** The task bar above the prompt, one drawing: dot, title, purple gradient track, ticks, Tasks pill, percent. */
function bandSvg(p: BandPlan, W: number): string {
  const n = p.steps.length
  const done = doneCount(p.steps)
  const ratio = n ? done / n : 0
  const title = fitPx(p.title, 13, Math.max(60, W * 0.35))
  const percent = `${Math.round(ratio * 100)}%`
  const barX = Math.round(14 + textPx(title, 13) + 12)
  const barW = Math.max(60, W - barX - 44)
  const y0 = (BAND_H - TRACK_H) / 2
  const fillW = Math.round(barW * ratio)
  // The step in progress glows softly from the fill to that step's end.
  const live = p.steps.some(st => st.status === 'in_progress')
  const liveW = live ? Math.round((barW * Math.min(n, done + 1)) / n) - fillW : 0
  const ticks: string[] = []
  for (let i = 1; i < n; i++) {
    const x = Math.round((barW * i) / n)
    if (x > fillW + 3) ticks.push(`<rect x="${x}" y="${TRACK_H / 2 - 4}" width="1.5" height="8" rx="0.75"/>`)
  }
  const label = `Tasks ${done}/${n}`
  const pillW = Math.round(18 + label.length * 6.4)
  const pillX = Math.max(0, Math.min(barW - pillW, fillW - pillW))
  const finished = n > 0 && done === n
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${BAND_H}" viewBox="0 0 ${W} ${BAND_H}">
<style>
.tt{fill:#1f1f1f}.pc{fill:#6b6b6b}.k{fill:#ece9fb}.tk{fill:#c9c2f0}
@media (prefers-color-scheme: dark){.tt{fill:#ececec}.pc{fill:#a3a3a3}.k{fill:#2a2640}.tk{fill:#4c4470}}
${twinkleCss(finished)}
.lv{animation:gl 1.6s ease-in-out infinite}@keyframes gl{0%,100%{opacity:.18}50%{opacity:.5}}
.sh{animation:sw 2.6s linear infinite}@keyframes sw{from{transform:translateX(-70px)}to{transform:translateX(${fillW + 70}px)}}
@media (prefers-reduced-motion: reduce){.s0,.s1,.s2,.s3,.lv,.sh{animation:none}}
</style>
<defs>
<linearGradient id="hdb-g" x1="0" x2="1"><stop offset="0" stop-color="${P_LIGHT}"/><stop offset=".55" stop-color="${P_MID}"/><stop offset="1" stop-color="${P_DEEP}"/></linearGradient>
<linearGradient id="hdb-s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="hdb-c"><rect width="${barW}" height="${TRACK_H}" rx="${TRACK_H / 2}"/></clipPath>
<clipPath id="hdb-f"><rect width="${fillW}" height="${TRACK_H}"/></clipPath>
</defs>
<circle cx="5" cy="${BAND_H / 2}" r="4" fill="${P_DEEP}"/>
<text class="tt" x="14" y="${BAND_H / 2 + 4.5}" font-family="${FONT}" font-size="13" font-weight="600">${xml(title)}</text>
<g transform="translate(${barX},${y0})">
<rect class="k" width="${barW}" height="${TRACK_H}" rx="${TRACK_H / 2}"/>
<g clip-path="url(#hdb-c)">
${liveW > 0 ? `<rect class="lv" x="${fillW}" width="${liveW}" height="${TRACK_H}" fill="${P_MID}"/>` : ''}
${fillW > 0 ? `<rect width="${fillW}" height="${TRACK_H}" fill="url(#hdb-g)"/>` : ''}
<g fill="#ffffff">${sparkles(fillW, TRACK_H, 1.6, 0.12, 0.4)}</g>
${fillW > 0 && !finished ? `<g clip-path="url(#hdb-f)"><rect class="sh" width="70" height="${TRACK_H}" fill="url(#hdb-s)"/></g>` : ''}
<g class="tk">${ticks.join('')}</g>
</g>
<rect x="${pillX}" width="${pillW}" height="${TRACK_H}" rx="${TRACK_H / 2}" fill="${P_DEEP}"/>
<text x="${pillX + pillW / 2}" y="${TRACK_H / 2 + 4}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600" fill="#ffffff">${xml(label)}</text>
</g>
<text class="pc" x="${W - 4}" y="${BAND_H / 2 + 4.5}" text-anchor="end" font-family="${FONT}" font-size="12.5" font-variant-numeric="tabular-nums">${percent}</text>
</svg>`
}

const CARD_BAR_H = 10

/**
 * One thick sparkle bar per subagent card. While it works a bright piece sweeps the track
 * (its length is not known); once over the whole bar fills and glows slowly. The drawing
 * depends only on the phase, so CSS moves it and redraws do not restart it.
 */
function cardBarSvg(phase: HelperPhase, color: string, W: number, seat: number): string {
  const id = `hdc${seat}`
  const H = CARD_BAR_H
  const fill = phase === 'failed' ? BAD : color
  const piece = Math.max(30, Math.round(W * 0.35))
  const working = phase === 'working'
  const body = working
    ? `<g class="mv"><rect width="${piece}" height="${H}" fill="url(#${id}-p)"/><g fill="#ffffff">${sparkles(piece, H, 1.6, 0.1, 0.35, seat * 11)}</g></g>`
    : `<rect width="${W}" height="${H}" fill="url(#${id}-g)"/><g fill="#ffffff">${sparkles(W, H, 1.6, 0.18, 0.3, seat * 11)}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
${twinkleCss(!working)}
.mv{animation:mv${seat} 1.8s ease-in-out infinite;animation-delay:-${(seat * 0.37) % 1.8}s}
@keyframes mv${seat}{from{transform:translateX(-${piece}px)}to{transform:translateX(${W}px)}}
@media (prefers-reduced-motion: reduce){.s0,.s1,.s2,.s3,.mv{animation:none}}
</style>
<defs>
<linearGradient id="${id}-g" x1="0" x2="1"><stop offset="0" stop-color="${fill}" stop-opacity=".55"/><stop offset="1" stop-color="${fill}"/></linearGradient>
<linearGradient id="${id}-p" x1="0" x2="1"><stop offset="0" stop-color="${fill}" stop-opacity="0"/><stop offset=".7" stop-color="${fill}"/><stop offset="1" stop-color="${fill}" stop-opacity=".9"/></linearGradient>
<clipPath id="${id}-c"><rect width="${W}" height="${H}" rx="${H / 2}"/></clipPath>
</defs>
<g clip-path="url(#${id}-c)">
<rect width="${W}" height="${H}" fill="${fill}" opacity=".16"/>
${body}
</g>
</svg>`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // HOME first: a plugin read from a directory marketplace has no /.claude/ in its root.
    home = (await $.env.get('HOME')) || ($.plugin.root.split('/.claude/')[0] ?? '')
    sessionId = await $.session.id().catch(() => '')
    await $.command.register({ name: 'helpers', description: 'Show the Helper Desk: the task progress bar and one live card per subagent', immediate: true })
    await $.tool.register({
      name: 'plan',
      description:
        'Save the plan for the job in front of you: the steps in order, each pending, in_progress or completed. ' +
        'It draws a progress bar above the prompt for the user. Send the whole list every time, like TodoWrite.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A short name for the job, a few words.' },
          steps: {
            type: 'array',
            description: 'Every step, in order.',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string', description: 'The step in a few plain words.' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
              },
              required: ['text', 'status'],
            },
          },
        },
        required: ['steps'],
      },
      // In front, not behind ToolSearch: a hidden tool never gets called.
      isDeferred: false,
    }).catch(err => log($, `register plan tool: ${String(err)}`))
    await readSwitch($)
    await loadPlan($)
    switcher ??= $.clock.every(SWITCH_MS, () => {
      void switchPoll($).catch(err => log($, `switch: ${String(err)}`))
    })
    // A reload keeps the drawn copy: carry on from it.
    if (!helpers.length) {
      const { value } = await $.state.get(HELPERS)
      if (value?.length) {
        // A copy from before body colours has no hue: its seat picks one.
        helpers = value.map(hp => ({ ...copy(hp), hue: typeof hp.hue === 'number' ? hp.hue : hp.seat % HUES.length }))
        seats = Math.max(...helpers.map(hp => hp.seat)) + 1
        nextHue = (Math.max(...helpers.map(hp => hp.hue)) + 1) % HUES.length
        syncTimers($)
      }
    }
    return next(e)
  })

  on('command.run', { command: 'helpers' }, async $ => {
    if (off) return { text: `${TITLE} is off. Turn it on with /mods.` }
    if (hidden) await setHidden($, false)
    await openPane($)
    return { text: helpers.length ? `${TITLE} opened.` : `${TITLE} opened. Cards show up when Claude starts a subagent.` }
  })

  on('ui.press', { plugin: NAME, element: 'hide' }, async ($, e) => {
    await setHidden($, true)
    try {
      $.ui.toast(`${TITLE} hidden. Type /helpers or open /mods to show it.`)
    } catch {
      // The toast is only a hint.
    }
    return { element: e.element }
  })

  // ✕ on the task bar hides it until the plan changes again.
  on('ui.press', { plugin: NAME, element: 'plan-dismiss' }, async ($, e) => {
    planShown = false
    holdTimer?.cancel()
    holdTimer = null
    await drawPlan($).catch(err => log($, `dismiss plan: ${String(err)}`))
    return { element: e.element }
  })

  on('ui.press', { plugin: NAME }, async ($, e, next) => {
    if (off) return next(e)
    if (e.element.startsWith('steps-')) {
      await toggleIn($, 'open', e.element.slice('steps-'.length))
      return { element: e.element }
    }
    if (e.element.startsWith('group-')) {
      await toggleIn($, 'folded', e.element.slice('group-'.length))
      return { element: e.element }
    }
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (off) return r
    const id = (r as { agentId?: string }).agentId
    if (id) {
      void addHelper($, id, e.description || 'Subagent', e.subagentType || 'subagent', shortModel(e.model ?? r.model ?? '')).catch(err =>
        log($, `spawn: ${String(err)}`),
      )
    }
    return r
  })

  // One unfiltered hook: a typed tool matcher makes tsc recurse through the connector types.
  on('tool.call', async ($, e, next) => {
    const tool = e.tool as string
    const args = e as unknown as Record<string, unknown>
    const id = e.agentId
    if (tool === PLAN_TOOL) {
      if (off) return { result: `${TITLE} is off, so no plan was saved. Carry on without it.` } as never
      if (id) return { result: 'Only the main chat keeps a plan. Carry on with your task.' } as never
      let said = 'Plan not saved: something went wrong. Carry on.'
      try {
        said = await planFromTool($, args)
      } catch (err) {
        await log($, `plan: ${String(err)}`)
      }
      turnPlanned = true
      sincePlan = 0
      staleNudged = false
      return { result: said } as never
    }
    if (off) return next(e)
    if (id) {
      void noteTool($, id, describe(tool, args)).catch(err => log($, `tool: ${String(err)}`))
      return next(e)
    }
    if (MIRRORED.has(tool)) {
      const r = await next(e)
      turnPlanned = true
      sincePlan = 0
      void mirror($, tool, args, r).catch(err => log($, `mirror ${tool}: ${String(err)}`))
      return r
    }
    const r = await next(e)
    return withNudge(r)
  })

  // A new prompt is a new task: the plan nudge counts from zero.
  on('prompt.submit', async ($, e, next) => {
    turnCalls = 0
    turnPlanned = false
    nudged = false
    sincePlan = 0
    staleNudged = false
    return next(e)
  })

  // A short system-prompt section, only while the mod is on.
  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    if (off || e.traits.includes('teammate') || e.traits.includes('bare')) return r
    return { sections: [...r.sections, { id: 'helper-desk:plan', text: PLAN_PROMPT, scope: 'session' as const }] }
  })

  // Each model request of a helper: its model, effort and token counts.
  on('turn.step', async function* ($, e, next) {
    const r = yield* next(e)
    const id = e.agentId
    if (id && !off) {
      const effort = e.effort === undefined ? '' : String(e.effort)
      void noteStep($, id, e.model, effort, r.usage ?? null).catch(err => log($, `step: ${String(err)}`))
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    const id = e.agentId
    if (id && !off && helpers.some(hp => hp.id === id)) {
      const failed = e.reason === 'error' || e.reason === 'refusal' || e.isAborted
      void finish($, id, failed ? 'failed' : 'done', e.usage ?? null).catch(err => log($, `turn: ${String(err)}`))
    }
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    const { value: isOff = false } = await $.state.get(OFF)
    if (isOff || off) return next(e)
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    // Svg draws on desktop, the editor and mobile; the terminal gets a glyph.
    const Svg = e.surface !== 'terminal' && 'Svg' in els ? els.Svg : null
    const { value: list = [] } = await $.state.get(HELPERS)
    const { value: clk = { tick: 0, now: 0 } } = await $.state.get(CLOCK)
    const { value: view = { open: [], folded: [] } } = await $.state.get(VIEW)
    const { value: cost = { usd: null } } = await $.state.get(COST)
    const width = Math.max(32, e.props.bodyColumns)
    // Inside a card: its border and padding take 4 columns, the pet PET_W more.
    const cw = width - 4 - PET_W

    const running = list.filter(hp => hp.phase === 'working')
    const finished = list.filter(hp => hp.phase === 'done')
    const stopped = list.filter(hp => hp.phase === 'failed')

    // Header tiles: only numbers the engine gave.
    const tiles: { label: string; value: string }[] = []
    if (cost.usd !== null) tiles.push({ label: 'Total chat cost', value: `$${cost.usd.toFixed(2)}` })
    if (list.some(hp => hp.hasUsage)) tiles.push({ label: 'Subagent tokens', value: tokenText(list.reduce((n, hp) => n + hp.tokens + hp.turnTokens, 0)) })
    if (list.length) {
      const start = Math.min(...list.map(hp => hp.startedAt))
      const end = running.length ? Math.max(clk.now, ...running.map(hp => hp.startedAt)) : Math.max(...list.map(hp => hp.endedAt))
      tiles.push({ label: 'Time', value: clockTime(end - start) })
    }
    const tileW = tiles.length ? Math.floor((width - (tiles.length - 1)) / tiles.length) : width

    // A running pet steps through its frames on the clock tick; a finished one stands still.
    const frameOf = (hp: Helper) => (hp.phase === 'working' ? Math.floor(clk.tick / FRAME_TICKS) % FRAMES : 0)

    const pet = (hp: Helper) => {
      const hue = hueOf(hp.hue)
      const frame = frameOf(hp)
      if (Svg) {
        return (
          <Box key={`pet-${hp.id}`} width={PET_W} flexShrink={0}>
            <Svg source={petSvg(hp.hue, frame)} alt={`Claude crab, ${hue.name}`} width={PET_PX_W} height={PET_PX_H} />
          </Box>
        )
      }
      return (
        <Box key={`pet-${hp.id}`} width={PET_W} flexShrink={0} flexDirection="column">
          <Text color={hue.color}>{frame % 2 ? ' ▜█▛' : ' ▟█▙'}</Text>
          <Text color={hue.color}>{frame % 2 ? ' ▘ ▝' : '  ▘▝'}</Text>
        </Box>
      )
    }

    const card = (hp: Helper) => {
      const hue = hueOf(hp.hue)
      const live = hp.phase === 'working'
      const isOpen = view.open.includes(hp.id)
      const mark = live ? '●' : hp.phase === 'done' ? '✓' : '✗'
      const markColor = hp.phase === 'failed' ? BAD : GOOD
      const time = clockTime((live ? Math.max(clk.now, hp.startedAt) : hp.endedAt) - hp.startedAt)
      const meta = [hp.hasUsage ? `${tokenText(hp.tokens + hp.turnTokens)} tokens` : '', time].filter(Boolean).join(' · ')
      const who = [hp.type, hp.model, hp.effort].filter(Boolean).join(' · ')
      const current = hp.steps[hp.steps.length - 1]
      const spin = SPIN[clk.tick % SPIN.length]!
      const pulse = PULSE[clk.tick % PULSE.length]!
      const lead = live
        ? `Step ${hp.count} · ${current?.live ?? 'Getting started'}`
        : hp.phase === 'done'
          ? `Done · ${hp.count} step${hp.count === 1 ? '' : 's'}`
          : `Stopped before it finished · ${hp.count} step${hp.count === 1 ? '' : 's'}`
      // Room for the spinner and pulse on a live line.
      const leadW = Math.max(6, cw - (live ? 2 + pulse.length + 1 : 0))
      const history = (live ? hp.steps.slice(0, -1) : hp.steps).slice(-HISTORY)
      const [b1, b2, b3] = barParts(hp.phase, cw, clk.tick, hp.seat)
      const barColor = hp.phase === 'failed' ? BAD : hue.color
      const rowW = cw - TAG_W
      // About 6.5 CSS pixels a column, as the pet's 48 pixels fill its 8.
      const barPx = Math.max(60, Math.floor(cw * 6.5))

      return (
        <Box
          key={`card-${hp.id}`}
          flexDirection="row"
          width={width}
          marginBottom={1}
          borderStyle="round"
          borderColor={live ? hue.color : undefined}
          borderDimColor={!live}
          paddingX={1}
          paddingY={1}
          gap={0}
        >
          {pet(hp)}
          <Box flexDirection="column" width={cw}>
            <Box flexDirection="row" justifyContent="space-between" width={cw}>
              <Box width={cw - 2}>
                <Text bold wrap="truncate-end">
                  {cut(hp.description, cw - 2)}
                </Text>
              </Box>
              <Text bold color={markColor}>{mark}</Text>
            </Box>
            <Box flexDirection="row" justifyContent="space-between" width={cw}>
              <Text dimColor wrap="truncate-end">
                {cut(who, Math.max(4, cw - meta.length - 1))}
              </Text>
              <Text dimColor>{meta}</Text>
            </Box>
            <Box flexDirection="row" width={cw} marginTop={1}>
              {live ? <Text bold color={ACCENT}>{`${spin} `}</Text> : null}
              <Box width={leadW}>
                <Text bold={live} color={live ? ACCENT : hp.phase === 'done' ? GOOD : BAD} wrap="truncate-end">
                  {cut(lead, leadW)}
                </Text>
              </Box>
              {live ? <Text color={ACCENT}>{` ${pulse}`}</Text> : null}
            </Box>
            {!isOpen &&
              history.map((st, i) => (
                <Text key={`h-${hp.id}-${i}`} dimColor wrap="truncate-end">
                  {cut(`  ${st.live}`, cw)}
                </Text>
              ))}
            {Svg ? (
              <Box key={`bar-${hp.id}`} width={cw} marginTop={1}>
                <Svg
                  source={cardBarSvg(hp.phase, hue.color, barPx, hp.seat)}
                  alt={live ? 'Working' : hp.phase === 'done' ? 'Done' : 'Stopped'}
                  width={barPx}
                  height={CARD_BAR_H}
                />
              </Box>
            ) : (
              <Text key={`bar-${hp.id}`} wrap="truncate-end">
                <Text dimColor>{b1}</Text>
                <Text color={barColor}>{b2}</Text>
                <Text dimColor>{b3}</Text>
              </Text>
            )}
            {hp.steps.length ? (
              <Button key={`steps-${hp.id}`} plain dimColor onPress={() => undefined}>
                {isOpen ? '▾ Hide steps' : `▸ All ${hp.count} step${hp.count === 1 ? '' : 's'}`}
              </Button>
            ) : null}
            {isOpen ? (
              <Box key={`list-${hp.id}`} flexDirection="column" width={cw}>
                {hp.count > hp.steps.length ? <Text dimColor>{`${hp.count - hp.steps.length} older steps not kept`}</Text> : null}
                {hp.steps.map((st, i) => {
                  const [label, dim] = fitRow(st.label, st.dim, rowW)
                  return (
                    <Box key={`s-${hp.id}-${i}`} flexDirection="row" width={cw}>
                      <Box width={TAG_W}>
                        <Text color={KIND_COLOR[st.kind]}>{st.kind}</Text>
                      </Box>
                      <Box width={rowW}>
                        <Text wrap="truncate-end">
                          {label}
                          {dim ? <Text dimColor>{`  ${dim}`}</Text> : null}
                        </Text>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            ) : null}
          </Box>
        </Box>
      )
    }

    // A heading per group: a filled bar the full width, its title and count in bold, and an
    // arrow that folds the group.
    const group = (id: string, title: string, members: Helper[], fill: string, ink: string) => {
      if (!members.length) return null
      const folded = view.folded.includes(id)
      const label = `${title} · ${members.length}`
      const room = Math.max(label.length, width - 6)
      return (
        <Box key={`grp-${id}`} flexDirection="column" width={width} marginTop={1}>
          <Box key={`head-${id}`} flexDirection="row" width={width} backgroundColor={fill} paddingX={1} marginBottom={1}>
            <Button key={`group-${id}`} plain onPress={() => undefined}>
              <Text bold color={ink} backgroundColor={fill}>
                {folded ? '▸ ' : '▾ '}
              </Text>
            </Button>
            <Text bold color={ink} backgroundColor={fill} wrap="truncate-end">
              {label.padEnd(room)}
            </Text>
          </Box>
          {folded ? null : members.map(card)}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" width={width}>
        <Box key="header" flexDirection="row" justifyContent="space-between" gap={1} width={width} marginBottom={1}>
          <Text bold color={running.length ? ACCENT : list.length ? GOOD : undefined}>
            {list.length ? `${list.length} subagent${list.length === 1 ? '' : 's'} in this chat` : 'No subagents yet'}
          </Text>
          <Button key="hide" label="Hide" dimColor onPress={() => undefined} />
        </Box>
        {tiles.length ? (
          <Box key="tiles" flexDirection="row" gap={1} width={width} marginBottom={1}>
            {tiles.map(t => (
              <Box key={`tile-${t.label}`} flexDirection="column" borderStyle="round" paddingX={1} paddingY={1} width={tileW}>
                <Text dimColor wrap="truncate-end">
                  {t.label}
                </Text>
                <Text bold color={ACCENT} wrap="truncate-end">
                  {t.value}
                </Text>
              </Box>
            ))}
          </Box>
        ) : null}
        {list.length ? null : <Text dimColor>Cards show up here when Claude starts a subagent.</Text>}
        {group('running', 'Running', running, GOOD, '#ffffff')}
        {group('finished', 'Finished', finished, WARN, INK)}
        {group('stopped', 'Stopped', stopped, BAD, '#ffffff')}
      </Box>
    )
  })

  // The task bar above the prompt: it moves each time a to-do or plan step is marked done.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (off || e.props.hasSurvey) return next(e)
    const { value: isOff = false } = await $.state.get(OFF)
    const { value: isHidden = false } = await $.state.get(HIDDEN)
    const { value: p = null } = await $.state.get(PLAN)
    if (isOff || isHidden || hidden || !p || !p.shown || !p.steps.length) return next(e)
    // The other mods' bands draw above this one. Claude Code's own placeholder is never nested.
    const drawn = await Promise.resolve(next(e)).catch(() => null)
    const rest = drawn && typeof drawn === 'object' && (drawn as { type?: string }).type !== 'engine' ? drawn : null
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const cols = typeof e.props.bodyColumns === 'number' && e.props.bodyColumns > 0 ? Math.floor(e.props.bodyColumns) : 0
    const n = p.steps.length
    const done = doneCount(p.steps)
    const pct = `${Math.round((done / n) * 100)}%`
    const label = `Tasks ${done}/${n}`
    const now = p.steps.find(st => st.status === 'in_progress')
    const nextUp = p.steps.find(st => st.status === 'pending')
    const line = now ? `Now: ${now.text}` : done === n ? 'All steps done' : nextUp ? `Next: ${nextUp.text}` : ''
    const dismiss = <Button key="plan-dismiss" label="✕" plain dimColor role="dismiss" onPress={() => undefined} />

    let row: unknown
    let w: number
    if (e.surface !== 'terminal' && 'Svg' in els) {
      const { Svg } = els
      // About 8 CSS pixels a column; the rest is the dismiss button and its gap.
      const px = Math.max(180, Math.min(1600, (cols || 100) * 8 - 56))
      w = cols || BAR_FALLBACK
      row = (
        <Box key="plan-row" flexDirection="row" alignItems="center" gap={1}>
          <Svg key="plan-svg" source={bandSvg(p, px)} alt={`${p.title}: ${label}, ${pct}`} width={px} height={BAND_H} />
          {dismiss}
        </Box>
      )
    } else {
      // The terminal: dot, title, a gradient of blocks, the step in progress shimmering, count, percent.
      const { value: tick = 0 } = await $.state.get(SHIM)
      w = cols || BAR_FALLBACK
      const titleW = Math.max(6, Math.min(28, p.title.length, Math.floor(w / 3)))
      const barW = Math.max(6, w - titleW - label.length - pct.length - 10)
      const fillC = Math.round((barW * done) / n)
      const liveC = now ? Math.max(0, Math.round((barW * Math.min(n, done + 1)) / n) - fillC) : 0
      const cells = Array.from({ length: fillC }, (_, i) => mix(P_LIGHT, P_DEEP, fillC > 1 ? i / (fillC - 1) : 1))
      row = (
        <Box key="plan-row" flexDirection="row" gap={1} width={w}>
          <Text color={P_DEEP}>●</Text>
          <Box width={titleW} flexShrink={0}>
            <Text bold wrap="truncate-end">
              {cut(p.title, titleW)}
            </Text>
          </Box>
          <Text key="plan-bar">
            {cells.map((c, i) => (
              <Text key={`f-${i}`} color={c}>
                █
              </Text>
            ))}
            {liveC ? <Text color={tick % 2 ? P_MID : P_LIGHT}>{'▓'.repeat(liveC)}</Text> : null}
            <Text dimColor>{'░'.repeat(Math.max(0, barW - fillC - liveC))}</Text>
          </Text>
          <Text bold color={P_MID}>{label}</Text>
          <Text dimColor>{pct}</Text>
          {dismiss}
        </Box>
      )
    }
    return (
      <Box flexDirection="column">
        {rest as never}
        <Box key="plan-band" flexDirection="column">
          {row as never}
          {line ? (
            <Text key="plan-now" dimColor wrap="truncate-end">
              {cut(line, w)}
            </Text>
          ) : null}
        </Box>
      </Box>
    )
  })
}
