import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMessage } from 'claude-code'

import type { CallRow, ConnectorRow, FileRow, Inventory, Plan, PlanStep, SkillRow } from '../types'
import { CONNECTOR_NAMES, connectorName as nameOf, splitTool } from './connectors'

const PLUGIN = 'chat-inventory'
const NAME = 'chat-inventory'
const PANE = 'chat-inventory'
const TITLE = 'In this chat'
const MAX_ROWS = 40
const MAX_CALLS = 60
// Context files show in a window this many rows tall; Up and Down move it.
const FILE_WINDOW = 10
const FILE_STEP = 5
const SECTIONS = ['todo', 'connectors', 'files', 'skills'] as const
const OFF_LINE = 'Turned off. Open /mods to turn it on.'
const NO_PLAN = 'No to-do list yet. Claude makes one for jobs with several distinct steps.'
// The plan tool helper-desk registers, and Claude's built-in list tools, all feed the To-do section.
const PLAN_TOOL = 'mcp__helper-desk__plan'
const PLAN_TOOLS = new Set([PLAN_TOOL, 'TodoWrite', 'TaskCreate', 'TaskUpdate'])

const ACCENT = '#d97757'
const INFO = '#2563eb'
const GOOD = '#16a34a'

const EMPTY: Inventory = { connectors: [], files: [], skills: [] }
const inv = atom({ plugin: 'chat-inventory', key: 'inv' } as const, EMPTY)
const NO_STEPS: Plan = { title: '', steps: [], updatedAt: 0 }
const planAtom = atom({ plugin: 'chat-inventory', key: 'plan' } as const, NO_STEPS)
const openKey = atom({ plugin: 'chat-inventory', key: 'open' } as const, '')
const offAtom = atom({ plugin: 'chat-inventory', key: 'off' } as const, false)
// Sections the person closed, and the first context file row shown. Kept per chat in $.state.
const foldedAtom = atom({ plugin: 'chat-inventory', key: 'folded' } as const, [] as string[])
const fileTopAtom = atom({ plugin: 'chat-inventory', key: 'fileTop' } as const, 0)

// Logo keys whose slug differs from the name.
const ALIAS: Record<string, string> = { googleworkspace: 'google', metaads: 'meta' }

// CLI tools in Bash that count as connectors. Matched as a command word.
const CLI_RE = /(?:^|[;&|(\n`]|\bdo\b|\bthen\b|\$\()\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(gws|firecrawl|youtube-pp-cli|browser-harness|agent-browser)\b([^;&|\n`)]*)/g
const GWS: Record<string, string> = {
  gmail: 'Gmail',
  calendar: 'Google Calendar',
  drive: 'Google Drive',
  sheets: 'Google Sheets',
  docs: 'Google Docs',
}
const CLI_NAME: Record<string, string> = {
  firecrawl: 'Firecrawl',
  'youtube-pp-cli': 'YouTube',
  'browser-harness': 'Browser',
  'agent-browser': 'Browser',
}

// Input keys worth showing, best first.
const ARG_KEYS = [
  'query', 'q', 'search', 'searchQuery', 'keyword', 'keywords', 'url', 'file_path', 'path', 'filename', 'fileName',
  'name', 'title', 'subject', 'transcriptId', 'threadId', 'messageId', 'documentId', 'spreadsheetId', 'fileId',
  'pageId', 'eventId', 'calendarId', 'id', 'email', 'channel', 'prompt', 'skill', 'command',
]
const NOT_ARGS = new Set(['tool', 'tool_use_id', 'agentId', 'hook_event_name', 'session_id', 'transcript_path', 'cwd', 'permission_mode', 'surface'])

// Module variables reset on a reload; the lists live in $.state.
let home = ''
let seq = 0
let autoOpened = false
let off = false
// "chat-inventory:hidden": true in switches.json closes the pane and stops it opening by itself.
let hidden = false
let switchTimer: unknown
const seen = new Set<string>()
let skillNames = new Set<string>()

const slug = (name: string) => {
  const s = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return ALIAS[s] ?? s
}

const clip = (s: string, n = 60) => {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat
}

const base = (p: string) => (/^[~/.]/.test(p) && p.includes('/') ? p.slice(p.replace(/\/+$/, '').lastIndexOf('/') + 1) : p)

/** The friendly connector name for an MCP tool, or '' when the tool is not a connector's. */
function connectorName(tool: string): string {
  if (!tool.startsWith('mcp__')) return ''
  const { server, name } = splitTool(tool)
  if (!server || server.startsWith('ccd_')) return ''
  return nameOf(server, name)
}

/** "fireflies_get_transcripts" for Fireflies becomes "get transcripts". */
function humanTool(tool: string, name: string): string {
  const raw = tool.split('__').slice(2).join('__') || tool
  const words = raw.split(/[-_\s]+/).filter(Boolean).map(w => w.toLowerCase())
  const own = new Set([slug(name), ...name.toLowerCase().split(/\s+/)])
  while (words.length > 1 && (own.has(words[0]!) || /^s\d+$/.test(words[0]!))) words.shift()
  return words.join(' ')
}

/** The main argument of a call, short. */
function summaryOf(input: Record<string, unknown>): string {
  for (const k of ARG_KEYS) {
    const v = input[k]
    if (typeof v === 'string' && v.trim()) return clip(base(v))
    if (typeof v === 'number') return String(v)
  }
  for (const [k, v] of Object.entries(input)) {
    if (NOT_ARGS.has(k)) continue
    if (typeof v === 'string' && v.trim()) return clip(base(v))
  }
  for (const [k, v] of Object.entries(input)) {
    if (NOT_ARGS.has(k)) continue
    if (typeof v === 'number' || typeof v === 'boolean') return clip(`${k} ${v}`)
  }
  return ''
}

/** The main argument of a CLI line: a query or id in --params, else the rest of the line. */
function cliSummary(rest: string): string {
  const m = /\\?"(q|query|id|fileId|spreadsheetId|documentId|calendarId|url)\\?"\s*:\s*\\?"([^"\\]+)/.exec(rest)
  if (m) return clip(m[2]!)
  const url = /https?:\/\/\S+/.exec(rest)
  if (url) return clip(url[0])
  return clip(rest.replace(/<<-?\s*'?\w+'?/, '').replace(/^\s*(?:[a-z][a-zA-Z-]*\s*)+/, ''))
}

type CallHit = { kind: 'connector'; name: string; call: Omit<CallRow, 'at'> }
type Hit = CallHit | { kind: 'file' | 'skill'; name: string; always?: boolean }

/** Connector calls inside one Bash command line. */
function cliHits(command: string): CallHit[] {
  const out: CallHit[] = []
  const done = new Set<string>()
  for (const m of command.matchAll(CLI_RE)) {
    const cmd = m[1]!
    const rest = m[2] ?? ''
    let name = CLI_NAME[cmd] ?? ''
    let tool = ''
    if (cmd === 'gws') {
      const svc = /^\s*([a-z]+)/.exec(rest)?.[1] ?? ''
      name = GWS[svc] ?? 'Google Workspace'
      const words = rest
        .trim()
        .split(/\s+/)
        .filter(w => /^[a-z][a-zA-Z]*$/.test(w))
      tool = (GWS[svc] ? words.slice(1) : words).slice(0, 3).join(' ') || svc || 'run'
    } else if (cmd === 'firecrawl' || cmd === 'youtube-pp-cli') {
      tool = /^\s*([a-z][a-z-]*)/.exec(rest)?.[1]?.replace(/-/g, ' ') ?? 'run'
    } else {
      tool = 'run script'
    }
    const summary = cmd === 'browser-harness' || cmd === 'agent-browser' ? '' : cliSummary(rest)
    const id = `${name}|${tool}|${summary}`
    if (done.has(id)) continue
    done.add(id)
    out.push({ kind: 'connector', name, call: { tool, summary, cli: true } })
  }
  return out
}

/** What one tool call adds to the lists. */
function hitsOf(tool: string, input: Record<string, unknown>): Hit[] {
  // The plan tool is the To-do section, not a connector.
  if (tool === PLAN_TOOL) return []
  const connector = connectorName(tool)
  if (connector) return [{ kind: 'connector', name: connector, call: { tool: humanTool(tool, connector), summary: summaryOf(input), cli: false } }]
  if (tool === 'Bash' && typeof input.command === 'string') return cliHits(input.command)
  if (tool === 'Read' && typeof input.file_path === 'string') {
    const fp = input.file_path
    // A skill file read on purpose is a skill, named for its folder.
    const skill = /\/([^/]+)\/SKILL\.md$/.exec(fp)
    if (skill) return [{ kind: 'skill', name: skill[1]! }]
    // Claude's own spill files (big tool results, temp copies) are not context the person gave it.
    if (/\/tool-results\/|^\/private\/tmp\/|^\/tmp\/|\/\.claude\/projects\/[^/]+\/[0-9a-f-]{36}\//.test(fp)) return []
    return [{ kind: 'file', name: fp }]
  }
  if (tool === 'Skill' && typeof input.skill === 'string' && input.skill) return [{ kind: 'skill', name: input.skill.replace(/^\//, '') }]
  return []
}

const tilde = (p: string) => (home && p.startsWith(home) ? `~${p.slice(home.length)}` : p)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const pad = (n: number) => String(n).padStart(2, '0')
const clockTime = (ms: number) => {
  if (!ms) return ''
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function logError($: EngineInterface, where: string, err: unknown) {
  try {
    const path = `${home}/.claude/mods-logs/${PLUGIN}.log`
    let old = ''
    try {
      old = String(await $.fs.read(path))
    } catch {
      await $.process.run(['mkdir', '-p', `${home}/.claude/mods-logs`])
    }
    const line = `${new Date(await $.clock.now()).toISOString()} ${where}: ${String(err instanceof Error ? err.message : err)}\n`
    await $.fs.write(path, old + line)
  } catch {
    // Nowhere left to report it.
  }
}

function bumpConnector(rows: ConnectorRow[], hit: CallHit, at: number, time: number): ConnectorRow[] {
  const key = slug(hit.name)
  const old = rows.find(r => r.key === key)
  const rest = rows.filter(r => r.key !== key)
  const calls = [...(old?.calls ?? []), { ...hit.call, at: time }].slice(-MAX_CALLS)
  return [
    ...rest,
    {
      key,
      name: hit.name,
      count: (old?.count ?? 0) + 1,
      seq: at,
      cli: (old?.cli ?? false) || hit.call.cli,
      mcp: (old?.mcp ?? false) || !hit.call.cli,
      calls,
    },
  ]
}

function bumpSkill(rows: SkillRow[], name: string, at: number, always: boolean): SkillRow[] {
  const old = rows.find(r => r.name === name)
  const rest = rows.filter(r => r.name !== name)
  if (always) return [...rest, { name, count: old?.count ?? 0, seq: old?.seq ?? at, always: true }]
  return [...rest, { name, count: (old?.count ?? 0) + 1, seq: at, always: old?.always ?? false }]
}

type Stamped = { hit: Hit; at: number; time: number }

function apply(list: Inventory, hits: Stamped[]): Inventory {
  let { connectors, files, skills } = list
  for (const { hit, at, time } of hits) {
    if (hit.kind === 'connector') connectors = bumpConnector(connectors, hit as CallHit, at, time)
    else if (hit.kind === 'skill') skills = bumpSkill(skills, hit.name, at, hit.always === true)
    else files = [...files.filter(f => f.path !== hit.name), { path: hit.name, auto: false, seq: at }]
  }
  return { connectors, files, skills }
}

const STATUSES = new Set(['pending', 'in_progress', 'completed'])
const statusOf = (v: unknown): PlanStep['status'] => (typeof v === 'string' && STATUSES.has(v) ? (v as PlanStep['status']) : 'pending')
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Steps from a list of objects, reading the text from the first key that has it. */
function stepsOf(raw: unknown, textKeys: string[]): PlanStep[] {
  if (!Array.isArray(raw)) return []
  const out: PlanStep[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const text = textKeys.map(k => str(o[k])).find(Boolean) ?? ''
    if (!text) continue
    const active = str(o.activeForm)
    out.push({ text, status: statusOf(o.status), ...(active ? { active } : {}) })
  }
  return out
}

/** The plan after one main-chat call to a plan tool, or null when the call changes nothing. */
function planAfter(cur: Plan, tool: string, input: Record<string, unknown>, result: unknown, time: number): Plan | null {
  if (tool === 'TodoWrite') return { title: cur.title, steps: stepsOf(input.todos, ['content']), updatedAt: time }
  if (tool === PLAN_TOOL) {
    const title = typeof input.title === 'string' ? input.title.trim() : cur.title
    return { title, steps: stepsOf(input.steps, ['text']), updatedAt: time }
  }
  if (tool === 'TaskCreate') {
    const text = str(input.subject)
    if (!text) return null
    const made = (result as { task?: { id?: unknown } } | undefined)?.task?.id
    const id = typeof made === 'string' || typeof made === 'number' ? String(made) : String(cur.steps.length + 1)
    const active = str(input.activeForm)
    return { ...cur, steps: [...cur.steps, { text, status: 'pending', id, ...(active ? { active } : {}) }], updatedAt: time }
  }
  if (tool === 'TaskUpdate') {
    const id = str(input.taskId) || (typeof input.taskId === 'number' ? String(input.taskId) : '')
    let at = cur.steps.findIndex(st => st.id === id)
    if (at < 0 && /^\d+$/.test(id) && !cur.steps.some(st => st.id)) at = Number(id) - 1
    const old = cur.steps[at]
    if (!old) return null
    if (input.status === 'deleted') return { ...cur, steps: cur.steps.filter((_, i) => i !== at), updatedAt: time }
    const text = str(input.subject) || old.text
    const active = str(input.activeForm) || old.active
    const status = input.status === undefined ? old.status : statusOf(input.status)
    const steps = cur.steps.map((st, i) => (i === at ? { ...st, text, status, ...(active ? { active } : {}) } : st))
    return { ...cur, steps, updatedAt: time }
  }
  return null
}

/** Watches a plan tool call in the main chat, so the list works with helper-desk off. */
async function watchPlan($: EngineInterface, call: Record<string, unknown> & { tool: string }, result: unknown, time: number) {
  if (!PLAN_TOOLS.has(call.tool) || call.agentId) return false
  let changed = false
  await update($, planAtom, cur => {
    const nextPlan = planAfter(cur, call.tool, call, result, Math.max(time, cur.updatedAt + 1))
    if (!nextPlan) return cur
    changed = true
    return nextPlan
  })
  return changed
}

const planPath = (sid: string) => `${home}/.claude/mods-state/plan-${sid}.json`

/** Reads the shared plan file for this chat; it wins when it is newer than what the pane has. Never throws. */
async function readPlan($: EngineInterface) {
  try {
    const path = planPath(await $.session.id())
    if (!(await $.fs.exists(path))) return
    const json = JSON.parse(String(await $.fs.read(path))) as Record<string, unknown>
    const at = typeof json.updatedAt === 'string' ? Date.parse(json.updatedAt) : typeof json.updatedAt === 'number' ? json.updatedAt : NaN
    if (!Number.isFinite(at)) return
    const cur = await read($, planAtom)
    if (at <= cur.updatedAt) return
    // Keep TodoWrite's present-tense text and TaskCreate's ids for steps the file also has.
    const steps = stepsOf(json.steps, ['text']).map(st => {
      const was = cur.steps.find(o => o.text === st.text)
      return { ...st, ...(was?.active && !st.active ? { active: was.active } : {}), ...(was?.id ? { id: was.id } : {}) }
    })
    const title = typeof json.title === 'string' ? json.title.trim() : ''
    await update($, planAtom, () => ({ title, steps, updatedAt: at }))
  } catch (err) {
    await logError($, 'plan', err)
  }
}

/** Splits text into lines no wider than `width` columns, breaking at spaces. */
function wrapLines(text: string, width: number): string[] {
  const w = Math.max(8, width)
  const lines: string[] = []
  let cur = ''
  for (const word of text.replace(/\s+/g, ' ').trim().split(' ')) {
    let rest = word
    while (rest.length > w) {
      if (cur) lines.push(cur)
      cur = ''
      lines.push(rest.slice(0, w))
      rest = rest.slice(w)
    }
    if (!rest) continue
    if (!cur) cur = rest
    else if (cur.length + 1 + rest.length <= w) cur += ` ${rest}`
    else {
      lines.push(cur)
      cur = rest
    }
  }
  if (cur || !lines.length) lines.push(cur)
  return lines
}

async function openPane($: EngineInterface) {
  await $.ui.open({ id: PANE, title: TITLE })
}

async function record($: EngineInterface, id: string, hits: Hit[]) {
  if (!hits.length) return
  if (id) {
    if (seen.has(id)) return
    seen.add(id)
  }
  const time = await $.clock.now()
  const stamped = hits.map(hit => {
    seq += 1
    return { hit, at: seq, time }
  })
  await update($, inv, list => apply(list, stamped))
  autoOpen($)
}

/** Opens the pane the first time the chat uses something, unless it is hidden. */
function autoOpen($: EngineInterface) {
  if (autoOpened || hidden) return
  autoOpened = true
  void openPane($).catch(err => logError($, 'open', err))
}

async function loadSkillNames($: EngineInterface) {
  const names = new Set<string>()
  try {
    const usage = await $.session.usage({ breakdown: 'summary' })
    for (const s of usage.context.breakdown?.skills?.skillFrontmatter ?? []) names.add(s.name)
  } catch {
    // No breakdown: fall back to the command list below.
  }
  if (names.size) skillNames = names
  return names
}

/** True when a typed slash command is a skill. */
async function isSkill($: EngineInterface, name: string) {
  if (!skillNames.size) await loadSkillNames($)
  if (skillNames.has(name)) return true
  if (skillNames.size) return false
  const cmds = await $.command.list()
  return cmds.some(c => c.name === name && c.source === 'user')
}

const skillOfPath = (p: string) => /\/([^/]+)\/SKILL\.md$/.exec(p)?.[1] ?? ''

/** Memory files the chat loaded at start. A SKILL.md among them is a skill, always loaded. */
async function loadMemoryFiles($: EngineInterface) {
  const usage = await $.session.usage({ breakdown: 'summary' })
  const b = usage.context.breakdown
  if (!b) return
  for (const s of b.skills?.skillFrontmatter ?? []) skillNames.add(s.name)
  const all = b.memoryFiles.map(m => m.path).filter(Boolean)
  const skills = all.map(skillOfPath).filter(Boolean)
  const paths = all.filter(p => !skillOfPath(p))
  if (!paths.length && !skills.length) return
  await update($, inv, list => {
    const have = new Set(list.files.map(f => f.path))
    const added: FileRow[] = paths.filter(p => !have.has(p)).map((p, i) => ({ path: p, auto: true, seq: -1000 + i }))
    const files = list.files.filter(f => !skillOfPath(f.path)).map(f => (paths.includes(f.path) ? { ...f, auto: true } : f))
    let rows = list.skills
    skills.forEach((name, i) => {
      rows = bumpSkill(rows, name, -2000 + i, true)
    })
    return { ...list, files: [...files, ...added], skills: rows }
  })
}

/** tool_use id to the time it was written, from this chat's transcript file. */
async function callTimes($: EngineInterface): Promise<Map<string, number>> {
  const times = new Map<string, number>()
  try {
    const sid = await $.session.id()
    const cwd = await $.session.cwd()
    const path = `${home}/.claude/projects/${cwd.replace(/[^a-zA-Z0-9]/g, '-')}/${sid}.jsonl`
    if (!(await $.fs.exists(path))) return times
    const text = String(await $.fs.read(path))
    for (const line of text.split('\n')) {
      if (!line.includes('"tool_use"')) continue
      const ts = /"timestamp":"([^"]+)"/.exec(line)?.[1]
      const ms = ts ? Date.parse(ts) : NaN
      if (!Number.isFinite(ms)) continue
      for (const m of line.matchAll(/"type":"tool_use","id":"([^"]+)"/g)) times.set(m[1]!, ms)
    }
  } catch {
    // Times stay blank for older calls.
  }
  return times
}

const SLASH_RE = /<command-name>\/?([\w:.-]+)<\/command-name>|^\/([\w:.-]+)/

async function seed($: EngineInterface) {
  const main = await $.session.messages()
  const all: SessionMessage[] = [...main]
  for (const m of main) {
    for (const u of m.toolUses) {
      if (!u.agentId) continue
      const child = await $.session.messages({ agentId: u.agentId })
      if (Array.isArray(child)) all.push(...child)
    }
  }
  // Plan calls already in the chat, oldest first, stamped old so a newer plan file still wins.
  let plan = await read($, planAtom)
  let planChanged = false
  for (const m of main) {
    for (const u of m.toolUses) {
      if (u.agentId || !PLAN_TOOLS.has(u.tool)) continue
      const nextPlan = planAfter(plan, u.tool, u.input, undefined, plan.updatedAt + 1)
      if (nextPlan) {
        plan = nextPlan
        planChanged = true
      }
    }
  }
  if (planChanged) await update($, planAtom, cur => (cur.updatedAt >= plan.updatedAt ? cur : plan))
  const times = all.some(m => m.toolUses.length) ? await callTimes($) : new Map<string, number>()
  const hits: Stamped[] = []
  for (const m of all) {
    if (m.role === 'user' && typeof m.text === 'string') {
      const found = SLASH_RE.exec(m.text.trim())
      const name = found?.[1] ?? found?.[2]
      if (name && (await isSkill($, name))) {
        seq += 1
        hits.push({ hit: { kind: 'skill', name }, at: seq, time: 0 })
      }
    }
    for (const u of m.toolUses) {
      if (seen.has(u.tool_use_id)) continue
      const found = hitsOf(u.tool, u.input)
      if (!found.length) continue
      seen.add(u.tool_use_id)
      for (const hit of found) {
        seq += 1
        hits.push({ hit, at: seq, time: times.get(u.tool_use_id) ?? 0 })
      }
    }
  }
  // A reload of a chat that already used things does not pop the pane open again.
  if (hits.length) autoOpened = true
  if (hits.length) await update($, inv, list => apply(list, hits))
}

const HIDE_KEY = `${NAME}:hidden`
const switchesPath = () => `${home}/.claude/mods/switches.json`

async function readSwitches($: EngineInterface): Promise<Record<string, unknown>> {
  if (!(await $.fs.exists(switchesPath()))) return {}
  const json = JSON.parse(String(await $.fs.read(switchesPath()))) as unknown
  return json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : {}
}

/** Reads the shared switch file and the open request for this chat. Never throws. */
async function readSwitch($: EngineInterface) {
  try {
    let next = false
    let nowHidden = false
    try {
      const json = await readSwitches($)
      next = json[NAME] === false
      nowHidden = json[HIDE_KEY] === true
    } catch {
      next = false
      nowHidden = hidden
    }
    if (nowHidden && !hidden) await $.ui.close({ id: PANE }).catch(() => undefined)
    hidden = nowHidden
    if (next !== off) {
      off = next
      await update($, offAtom, () => next)
      $.ui.invalidate('ui.render')
    }
    const sid = await $.session.id()
    const req = `${home}/.claude/mods/.open-${NAME}-${sid}`
    if (await $.fs.exists(req)) {
      await $.process.run(['rm', '-f', req])
      if (!off) await openPane($)
    }
  } catch (err) {
    await logError($, 'switch', err)
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
    await logError($, 'save hidden', err)
  }
  hidden = value
  if (value) await $.ui.close({ id: PANE }).catch(() => undefined)
}

const newest = <T extends { seq: number }>(rows: T[]) => [...rows].sort((a, b) => b.seq - a.seq)

/** A letter tile with its call count in a corner badge. */
function badgeSvg(name: string, count: number): string {
  const tile =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="8" fill="${ACCENT}"/><text x="16" y="21.5" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff">${(name[0] ?? '?').toUpperCase()}</text></svg>`
  const inner = tile.replace('<svg ', '<svg x="1" y="7" ')
  const label = count > 99 ? '99+' : String(count)
  const w = label.length > 1 ? 9 + label.length * 4 : 15
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 44 40" width="44" height="40">' +
    inner +
    `<rect x="${42 - w}" y="1" width="${w}" height="15" rx="7.5" fill="${ACCENT}" stroke="#ffffff" stroke-width="1.5"/>` +
    `<text x="${42 - w / 2}" y="12" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="10" font-weight="700" fill="#ffffff">${label}</text>` +
    '</svg>'
  )
}

async function togglePress($: EngineInterface, element: string) {
  if (!element.startsWith('c:')) return
  const key = element.slice(2)
  await update($, openKey, cur => (cur === key ? '' : key))
}

async function toggleSection($: EngineInterface, id: string) {
  await update($, foldedAtom, cur => (cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]))
}

async function moveFiles($: EngineInterface, by: number) {
  const total = (await read($, inv)).files.length
  const last = Math.max(0, total - FILE_WINDOW)
  await update($, fileTopAtom, cur => Math.min(last, Math.max(0, Math.min(cur, last) + by)))
}

// Every key a connector can carry, so each press has its own handler.
const KNOWN_KEYS = [...new Set([...CONNECTOR_NAMES, ...Object.values(GWS), ...Object.values(CLI_NAME), 'Google Workspace'].map(slug))]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // HOME first: a plugin read from a directory marketplace has no /.claude/ in its root.
    home = (await $.env.get('HOME')) || ($.plugin.root.split('/.claude/')[0] ?? '')
    await $.command.register({ name: 'inventory', description: 'Show the connectors, files and skills this chat used', immediate: true })
    await readSwitch($)
    if (!switchTimer)
      switchTimer = $.clock.every(3000, () => {
        void readSwitch($)
        if (!off) void readPlan($)
      })
    void seed($)
      .then(() => readPlan($))
      .catch(err => logError($, 'seed', err))
    void loadMemoryFiles($).catch(err => logError($, 'memory', err))
    return next(e)
  })

  on('command.run', { command: 'inventory' }, async $ => {
    if (off) return { text: 'Chat Inventory is off. Turn it on with /mods.' }
    if (hidden) await setHidden($, false)
    await openPane($)
    void loadMemoryFiles($).catch(err => logError($, 'memory', err))
    return { text: 'Opened the In this chat pane.' }
  })

  // A skill the person typed as a slash command.
  on('command.run', async ($, e, next) => {
    const ran = await next(e)
    if (off) return ran
    try {
      if (e.command !== 'inventory' && (await isSkill($, e.command))) await record($, '', [{ kind: 'skill', name: e.command }])
    } catch (err) {
      await logError($, 'command', err)
    }
    return ran
  }).catch(($, e, next) => next(e))

  // Every tool call, in the main chat and in helpers: the call runs first, then it is counted.
  on('tool.call', async ($, e, next) => {
    if (off) return next(e)
    const ran = await next(e)
    try {
      if ((ran as { deny?: unknown }).deny === undefined) {
        const call = e as unknown as Record<string, unknown> & { tool: string; tool_use_id: string }
        await record($, call.tool_use_id, hitsOf(call.tool, call))
        if (await watchPlan($, call, (ran as { result?: unknown }).result, await $.clock.now())) autoOpen($)
      }
    } catch (err) {
      await logError($, 'tool.call', err)
    }
    return ran
  }).catch(($, e, next) => next(e))

  // A press on a connector logo opens its call list; a second press closes it.
  for (const key of KNOWN_KEYS) {
    on('ui.press', { plugin: 'chat-inventory', element: `c:${key}` }, async ($, e) => {
      await togglePress($, e.element)
      return { element: e.element }
    })
  }
  // The arrow on each section header opens or closes it.
  for (const id of SECTIONS) {
    on('ui.press', { plugin: 'chat-inventory', element: `sec-${id}` }, async ($, e) => {
      await toggleSection($, id)
      return { element: e.element }
    })
  }
  on('ui.press', { plugin: 'chat-inventory', element: 'files-up' }, async ($, e) => {
    await moveFiles($, -FILE_STEP)
    return { element: e.element }
  })
  on('ui.press', { plugin: 'chat-inventory', element: 'files-down' }, async ($, e) => {
    await moveFiles($, FILE_STEP)
    return { element: e.element }
  })

  on('ui.press', { plugin: 'chat-inventory', element: 'hide' }, async ($, e) => {
    await setHidden($, true)
    try {
      $.ui.toast('Chat Inventory hidden. Type /inventory or open /mods to show it.')
    } catch {
      // The toast is only a hint.
    }
    return { element: e.element }
  })

  // Connectors with no known key (an unmapped server).
  on('ui.press', { plugin: 'chat-inventory' }, async ($, e, next) => {
    const key = e.element.slice(2)
    if (!e.element.startsWith('c:') || KNOWN_KEYS.includes(key)) return next(e)
    await togglePress($, e.element)
    return { element: e.element }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const width = Math.max(20, e.props.bodyColumns)
    const inner = width - 4
    if (await read($, offAtom)) return <Text dimColor>{OFF_LINE}</Text>
    const list = await read($, inv)
    const open = await read($, openKey)
    const folded = await read($, foldedAtom)
    const Svg = e.surface !== 'terminal' && 'Svg' in els ? els.Svg : undefined

    // The header is the toggle: an arrow, the title, and the count on the right.
    const header = (key: string, title: string, right: string, isOpen: boolean) => (
      <Box key="h" flexDirection="row" justifyContent="space-between" width={inner}>
        <Button key={`sec-${key}`} plain onPress={() => undefined}>
          <Text color={ACCENT}>{isOpen ? '▾ ' : '▸ '}</Text>
          <Text bold>{title}</Text>
        </Button>
        {right ? <Text dimColor>{right}</Text> : null}
      </Box>
    )
    const none = <Text dimColor>None used yet</Text>
    const section = (key: string, title: string, right: string, body: unknown) => {
      const isOpen = !folded.includes(key)
      return (
        <Box key={key} flexDirection="column" borderStyle="round" paddingX={1} width={width} flexShrink={0}>
          {header(key, title, right, isOpen)}
          {isOpen ? (body as never) : null}
        </Box>
      )
    }
    const row = (key: string, left: unknown, right: unknown) => (
      <Box key={key} flexDirection="row" justifyContent="space-between" width={inner} height={1} gap={1}>
        <Box flexShrink={1} flexGrow={1} height={1} overflow="hidden">
          {left as never}
        </Box>
        {right ? <Box flexShrink={0}>{right as never}</Box> : null}
      </Box>
    )
    const capped = <T,>(rows: T[], draw: (r: T) => unknown) => {
      const shown = rows.slice(0, MAX_ROWS)
      const more = rows.length - shown.length
      return [...shown.map(draw), more > 0 ? <Text key="more" dimColor>{`+${more} more`}</Text> : null] as never
    }

    // Connectors: a grid of logos, then the open one's calls.
    const conns = newest(list.connectors)
    const callList = (c: ConnectorRow) => {
      const calls = [...c.calls].reverse()
      return (
        <Box key={`calls:${c.key}`} flexDirection="column" width={inner} marginTop={1}>
          <Text dimColor wrap="truncate-end">{`${c.name} calls, newest first`}</Text>
          {capped(calls, call => {
            const i = calls.indexOf(call)
            return row(
              `call:${c.key}:${i}`,
              <Text wrap="truncate-end">
                {call.tool}
                {call.summary ? <Text dimColor>{`  ${call.summary}`}</Text> : null}
              </Text>,
              <Text dimColor>{`${call.cli ? 'CLI ' : ''}${clockTime(call.at)}`.trim() || ' '}</Text>,
            )
          })}
        </Box>
      )
    }
    let connectorBody: unknown = none
    if (conns.length && Svg) {
      const tileCols = 12
      const perRow = Math.max(1, Math.floor(inner / tileCols))
      const rows: ConnectorRow[][] = []
      for (let i = 0; i < conns.length; i += perRow) rows.push(conns.slice(i, i + perRow))
      connectorBody = rows.map((r, ri) => (
        <Box key={`row${ri}`} flexDirection="column" width={inner}>
          <Box flexDirection="row" width={inner}>
            {r.map(c => (
              <Box key={`t:${c.key}`} flexDirection="column" alignItems="center" width={tileCols} flexShrink={0}>
                <Svg source={badgeSvg(c.name, c.count)} alt={`${c.name}, ${plural(c.count, 'call')}`} width={44} height={40} />
                <Button key={`c:${c.key}`} plain dimColor={open !== c.key} onPress={() => undefined}>
                  {c.name}
                </Button>
                <Text dimColor wrap="truncate-end">{c.cli && !c.mcp ? 'via CLI' : c.cli ? 'MCP + CLI' : ' '}</Text>
              </Box>
            ))}
          </Box>
          {r.some(c => c.key === open) ? callList(r.find(c => c.key === open)!) : null}
        </Box>
      ))
    } else if (conns.length) {
      // Terminal: one row per connector, the name pressable.
      connectorBody = conns.map(c => (
        <Box key={`r:${c.key}`} flexDirection="column" width={inner}>
          {row(
            `l:${c.key}`,
            <Button key={`c:${c.key}`} plain onPress={() => undefined}>
              {`${open === c.key ? '▾' : '▸'} ${c.name}`}
              {c.cli && !c.mcp ? <Text dimColor> via CLI</Text> : c.cli ? <Text dimColor> MCP + CLI</Text> : null}
            </Button>,
            <Text color={ACCENT}>{plural(c.count, 'call')}</Text>,
          )}
          {open === c.key ? callList(c) : null}
        </Box>
      ))
    }

    const files = newest(list.files)
    const fileRow = (f: FileRow) => {
          const cut = f.path.lastIndexOf('/')
          const name = f.path.slice(cut + 1)
          const full = tilde(cut > 0 ? f.path.slice(0, cut) : '/')
          // One line per file: long folders wrapped and drew over the row above on desktop.
          const parts = full.split('/').filter(Boolean)
          const folder = full.length > 28 && parts.length > 1 ? `…/${parts[parts.length - 1]}` : full
          return row(
            `f:${f.path}`,
            <Text wrap="truncate-end">
              {name}
              <Text dimColor>{`  ${folder}`}</Text>
            </Text>,
            f.auto ? <Text color={INFO}>auto</Text> : null,
          )
    }
    // A fixed window of rows: a Box cannot scroll inside a pane, so Up and Down move it.
    const top = Math.min(await read($, fileTopAtom), Math.max(0, files.length - FILE_WINDOW))
    const windowed = files.slice(top, top + FILE_WINDOW)
    const atTop = top === 0
    const atEnd = top + FILE_WINDOW >= files.length
    const readCount = files.filter(f => !f.auto).length
    const readLine = row('fread', <Text dimColor>Files read</Text>, <Text dimColor>{String(readCount)}</Text>)
    const fileBody = !files.length
      ? none
      : files.length <= FILE_WINDOW
        ? [readLine, ...files.map(fileRow)]
        : [
            readLine,
            <Box key="fwin" flexDirection="column" width={inner} height={FILE_WINDOW} overflow="hidden" flexShrink={0}>
              {windowed.map(fileRow)}
            </Box>,
            <Box key="fnav" flexDirection="row" justifyContent="space-between" width={inner} gap={1}>
              <Text dimColor wrap="truncate-end">{`${top + 1} to ${top + windowed.length} of ${files.length}`}</Text>
              <Box flexDirection="row" gap={1} flexShrink={0}>
                {atTop ? <Text dimColor>▴ Up</Text> : <Button key="files-up" plain onPress={() => undefined}>▴ Up</Button>}
                {atEnd ? <Text dimColor>▾ Down</Text> : <Button key="files-down" plain onPress={() => undefined}>▾ Down</Button>}
              </Box>
            </Box>,
          ]

    const skills = newest(list.skills)
    const skillBody = skills.length
      ? capped(skills, s =>
          row(
            `s:${s.name}`,
            <Text wrap="truncate-end">
              <Text color={ACCENT}>/</Text>
              {s.name}
            </Text>,
            <Text>
              {s.always ? <Text color={INFO}>always loaded</Text> : null}
              {s.always && s.count ? <Text dimColor>{'  '}</Text> : null}
              {s.count ? <Text dimColor>{plural(s.count, 'use')}</Text> : null}
            </Text>,
          ),
        )
      : none

    // To-do: one row per step, the mark in a fixed column and the text wrapped beside it.
    const plan = await read($, planAtom)
    const textCols = inner - 2
    const todoRow = (st: PlanStep, i: number) => {
      const done = st.status === 'completed'
      const now = st.status === 'in_progress'
      const lines = wrapLines(now && st.active ? st.active : st.text, textCols)
      return (
        <Box key={`todo:${i}`} flexDirection="row" width={inner} flexShrink={0}>
          <Box width={2} flexShrink={0}>
            {done ? <Text color={GOOD}>✓</Text> : now ? <Text color={ACCENT}>●</Text> : <Text dimColor>○</Text>}
          </Box>
          <Box flexDirection="column" width={textCols} flexShrink={0}>
            {lines.map((line, j) => (
              <Text key={`l${j}`} wrap="truncate-end" dimColor={done} strikethrough={done} bold={now}>
                {line}
              </Text>
            ))}
          </Box>
        </Box>
      )
    }
    const doneCount = plan.steps.filter(st => st.status === 'completed').length
    const todoBody = plan.steps.length
      ? [
          ...(plan.title ? wrapLines(plan.title, inner).map((line, j) => <Text key={`pt${j}`} dimColor wrap="truncate-end">{line}</Text>) : []),
          ...plan.steps.map(todoRow),
        ]
      : wrapLines(NO_PLAN, inner).map((line, j) => <Text key={`np${j}`} dimColor wrap="truncate-end">{line}</Text>)

    return (
      <Box flexDirection="column" width={width}>
        <Box key="top" flexDirection="row" justifyContent="flex-end" width={width}>
          <Button key="hide" label="Hide" dimColor onPress={() => undefined} />
        </Box>
        {section('todo', 'To-do', plan.steps.length ? `${doneCount} of ${plan.steps.length}` : '', todoBody)}
        {section('connectors', 'Connectors', String(conns.length), connectorBody)}
        {section('files', 'Context files', String(files.length), fileBody)}
        {section('skills', 'Skills', String(skills.length), skillBody)}
      </Box>
    )
  })
}
