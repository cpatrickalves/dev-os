import type { EngineInterface, PromptSubmitInput, Register } from 'claude-code'

// A long, loose prompt (a voice-note brain dump) gets an offer: shape it into
// the four-part brief first. Shaped text goes back in the prompt box for the
// person to read and edit; their next Enter sends it, since it holds THE JOB.

const CMD = 'shape'
const MIN_WORDS = 120
const MODEL = 'sonnet'
const QUESTION = 'This looks like a brain dump. Shape it into a clear brief first?'
const SHAPE = 'Shape it'
const AS_IS = 'Send as is'
const DROP_REASON = 'shaped into a brief'
const DONE_TOAST = 'Shaped into a brief. Check it, then press Enter.'
const HEADINGS = ['THE JOB', 'THE WHY', 'THE GUARDRAILS', 'DONE MEANS'] as const
const MAX_QUESTIONS = 3
const SKIPPED = 'skipped, no answer'
const STATUS_START = 'Shaping your brain dump...'
const STATUS_GAPS = 'Shaping your brain dump: reading for gaps'
const STATUS_WRITE = 'Shaping your brain dump: writing the brief'
// The dialog's chip holds 12 characters at most, so "Dump 1 of 2", not "Brain dump · 1 of 2".
const askHeader = (i: number, n: number) => `Dump ${i} of ${n}`
const ENABLED = { plugin: 'brain-dump', key: 'enabled' } as const

const SYSTEM = `You rewrite a person's spoken brain dump into a clear brief for an AI assistant.

Output exactly this shape and nothing else, no preamble, no code fences:

THE JOB
<one or two lines: what to make or do>

THE WHY
<who it is for and what it is used for>

THE GUARDRAILS
- <rules, limits, things to avoid, sources to use>

DONE MEANS
- <how we know it is finished and right>

Rules:
- Keep every fact, name, number, date, link, file and tool from the dump. Drop only filler and repeats.
- Add no new facts, numbers, names or requirements that are not in the dump.
- Where the dump says nothing for a part, write "unknown: ask me" for that part.
- The prompt may carry <answers>: follow-up questions the person answered. Treat each answer as their own words and use it in the part it belongs to. Where an answer says it was skipped, write that point as "unknown: ask me" in the part it belongs to.
- Write in the person's voice (I, we, my), as if they wrote the brief themselves.
- Plain, short English. Short lines and bullets.
- Never use em dashes or en dashes. Never use the word "ship"; say publish or deliver instead.`

// Step A: a second, cheap read that only looks for real gaps or conflicts.
const GAPS_SYSTEM = `You read a person's spoken brain dump before it is turned into a brief for an AI assistant.
Find only real gaps: two instructions in the dump that contradict each other, or a must-know fact that is missing and would change the work (for example who it is for, the deadline, the format, or which source to use).

Return JSON only, no prose, no code fences, in exactly this shape:
{"questions":[{"q":"<short question ending in a question mark>","options":["<option>","<option>"]}]}

Rules:
- 0 to 3 questions. When the dump is clear, return {"questions":[]}. Fewer is better.
- Never ask about something the dump already answers, and never ask about style or nice-to-haves.
- For a conflict, name both sides in the question and offer each side as an option.
- Each question has 2 or 3 short options (1 to 5 words), taken from the dump where possible. No "Other" option; the person can type their own.
- Plain, short English. Never use em dashes or en dashes. Never use the word "ship"; say publish or deliver instead.`

export type Gap = { q: string; options: string[] }
export type QA = { q: string; a: string | null }

let home = ''

// The /mods switchboard turns this mod off in every chat with switches.json.
const NAME = 'brain-dump'
let off = false

async function readSwitch($: EngineInterface) {
  let now = false
  try {
    const path = `${$.plugin.root.split('/.claude/')[0] ?? ''}/.claude/mods/switches.json`
    if (await $.fs.exists(path)) {
      const json = JSON.parse(String(await $.fs.read(path))) as Record<string, unknown>
      now = json[NAME] === false
    }
  } catch {
    now = off
  }
  if (now === off) return
  off = now
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // The next state change redraws anyway.
  }
}

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

// The person's own prompt: typed at the box, or sent from their phone.
const fromPerson = (e: PromptSubmitInput) => e.origin.kind === 'composer' || e.origin.kind === 'bridge'

export const isBrainDump = (text: string) => {
  const t = text.trim()
  if (t.startsWith('/')) return false
  if (t.includes('THE JOB')) return false
  return words(t) >= MIN_WORDS
}

// Holds the model to the house style even when it slips.
const stripFences = (raw: string) =>
  raw
    .trim()
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim()

export const houseStyle = (raw: string) => {
  let t = raw
  t = t.replace(/\s*[—–]\s*/g, ', ')
  t = t.replace(/\bship(s|ped|ping)?\b/gi, (w, end: string | undefined) => {
    const base = end === 's' ? 'delivers' : end === 'ped' ? 'delivered' : end === 'ping' ? 'delivering' : 'deliver'
    return w.startsWith('S') ? `D${base.slice(1)}` : base
  })
  return t
}

export const tidy = (raw: string) => {
  const t = houseStyle(stripFences(raw))
  const start = t.indexOf('THE JOB')
  return start > 0 ? t.slice(start) : t
}

const hasAllHeadings = (text: string) => HEADINGS.every(h => text.includes(h))

async function log($: EngineInterface, line: string) {
  try {
    const dir = `${home}/.claude/mods-logs`
    const path = `${dir}/brain-dump.log`
    let old = ''
    if (await $.fs.exists(path).catch(() => false)) old = String(await $.fs.read(path))
    else await $.process.run(['mkdir', '-p', dir])
    await $.fs.write(path, `${old}${new Date().toISOString()} ${line}\n`)
  } catch {
    // Logging must never break a prompt.
  }
}

async function isOn($: EngineInterface) {
  const v = await $.store.get('enabled').catch(() => undefined)
  return v !== false
}

const failWhy = (r: { reason: string; error?: string; status?: number | null }) =>
  r.reason === 'api-error' ? `the model call failed (${r.error}${r.status ? ` ${r.status}` : ''})` : r.reason === 'aborted' ? 'the model call timed out' : 'the model gave no text'

// Reads step A's reply. Throws on anything that is not the JSON we asked for;
// the caller turns that into zero questions.
export const parseGaps = (raw: string): Gap[] => {
  const t = stripFences(raw)
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('no JSON object in the reply')
  const json = JSON.parse(t.slice(a, b + 1)) as { questions?: unknown }
  if (!Array.isArray(json.questions)) throw new Error('no questions list in the reply')
  const out: Gap[] = []
  for (const item of json.questions) {
    if (out.length >= MAX_QUESTIONS) break
    const { q, options } = (item ?? {}) as { q?: unknown; options?: unknown }
    if (typeof q !== 'string' || !q.trim() || !Array.isArray(options)) continue
    const opts: string[] = []
    for (const o of options) {
      const label = typeof o === 'string' ? houseStyle(o.trim()) : ''
      if (!label || /^other$/i.test(label) || opts.includes(label)) continue
      if (opts.length < 3) opts.push(label)
    }
    if (opts.length < 2) continue
    let question = houseStyle(q.trim())
    if (!question.endsWith('?')) question = `${question}?`
    out.push({ q: question, options: opts })
  }
  return out
}

// Step A. Never throws: a failed call or bad JSON means zero questions, logged.
async function findGaps($: EngineInterface, dump: string): Promise<Gap[]> {
  try {
    const r = await $.model.complete({
      model: MODEL,
      system: GAPS_SYSTEM,
      prompt: `Here is the brain dump. Return the JSON.\n\n<dump>\n${dump}\n</dump>`,
      maxTokens: 800,
      effort: 'low',
      timeoutMs: 45_000,
    })
    if (!r.isAnswered) {
      await log($, `gap check failed: ${failWhy(r)}; going on with 0 questions`)
      return []
    }
    try {
      return parseGaps(r.text)
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err)
      await log($, `gap check parse failed: ${why}; reply began ${JSON.stringify(r.text.slice(0, 80))}; going on with 0 questions`)
      return []
    }
  } catch (err) {
    await log($, `gap check threw: ${err instanceof Error ? err.message : String(err)}; going on with 0 questions`)
    return []
  }
}

// Asks each gap in the engine's dialog. A typed answer under "Other" comes back
// as the text itself. Dismissing one skips it.
async function askGaps($: EngineInterface, gaps: Gap[]): Promise<QA[]> {
  const out: QA[] = []
  for (const [i, g] of gaps.entries()) {
    $.ui.status(`Shaping your brain dump: question ${i + 1} of ${gaps.length}`)
    let a: string | null = null
    try {
      const said = (await $.ui.ask(g.q, { options: g.options, header: askHeader(i + 1, gaps.length) })).trim()
      a = said || null
    } catch {
      a = null
    }
    out.push({ q: g.q, a })
  }
  return out
}

export const briefPrompt = (dump: string, qa: QA[]) => {
  let p = `Here is the brain dump. Rewrite it into the brief.\n\n<dump>\n${dump}\n</dump>`
  if (qa.length) {
    const lines = qa.map(x => `Q: ${x.q}\nA: ${x.a ?? SKIPPED}`).join('\n\n')
    p += `\n\nI asked the person these follow-up questions first. Use their answers in the brief. For a skipped one, write that point as "unknown: ask me" in the part it belongs to.\n\n<answers>\n${lines}\n</answers>`
  }
  return p
}

// Step B: the brief itself, now with the answers.
async function shape($: EngineInterface, dump: string, qa: QA[]): Promise<string> {
  const r = await $.model.complete({
    model: MODEL,
    system: SYSTEM,
    prompt: briefPrompt(dump, qa),
    maxTokens: 2000,
    effort: 'low',
    timeoutMs: 60_000,
  })
  if (!r.isAnswered) throw new Error(failWhy(r))
  const brief = tidy(r.text)
  if (!hasAllHeadings(brief)) throw new Error('the brief came back without all four parts')
  return brief
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    home = $.plugin.root.split('/.claude/')[0] ?? ''
    await $.command.register({ name: CMD, description: 'Turn brain dump shaping on or off' })
    await $.state.set(ENABLED, await isOn($))
    await readSwitch($).catch(() => undefined)
    $.clock.every(3000, () => {
      void readSwitch($).catch(() => undefined)
    })
    return result
  })

  on('command.run', { command: CMD }, async $ => {
    if (off) return { text: 'Brain-Dump Shaper is off. Turn it on with /mods.' }
    const now = !(await isOn($))
    await $.store.set('enabled', now)
    await $.state.set(ENABLED, now)
    const text = now ? 'Brain dump shaping is on.' : 'Brain dump shaping is off.'
    $.ui.toast(text)
    return { text }
  })

  on('prompt.submit', async ($, e, next) => {
    if (off) return next(e)
    if (!fromPerson(e) || !isBrainDump(e.text)) return next(e)
    if (!(await isOn($))) return next(e)

    let answer = ''
    try {
      answer = await $.ui.ask(QUESTION, { options: [SHAPE, AS_IS], header: 'Brain dump' })
    } catch {
      // Dismissed, or no one to ask: send it as typed.
      return next(e)
    }
    if (answer !== SHAPE) return next(e)

    const started = Date.now()
    const secs = () => `${((Date.now() - started) / 1000).toFixed(1)}s`
    let brief = ''
    let qa: QA[] = []
    try {
      $.ui.toast(STATUS_START)
      $.ui.status(STATUS_GAPS)
      const gaps = await findGaps($, e.text)
      qa = await askGaps($, gaps)
      $.ui.status(STATUS_WRITE)
      brief = await shape($, e.text, qa)
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err)
      $.ui.status(undefined)
      $.ui.toast(`Could not shape it: ${why}. Sent as is.`)
      await log($, `shape failed after ${secs()} (${qa.length} questions): ${why}`)
      return next(e)
    }
    $.ui.status(undefined)
    const skipped = qa.filter(x => x.a === null).length
    await log($, `shaped in ${secs()}: ${qa.length} questions, ${qa.length - skipped} answered, ${skipped} skipped`)

    const filled = await $.prompt.fill({ text: brief, mode: 'replace' }).catch((err: unknown) => {
      void log($, `prompt.fill threw: ${err instanceof Error ? err.message : String(err)}`)
      return null
    })
    if (!filled?.isFilled) {
      const why = filled?.refusal ? `the prompt box refused it (${filled.refusal})` : 'the prompt box did not take it'
      $.ui.toast(`Could not shape it: ${why}. Sent as is.`)
      await log($, `prompt.fill refused: ${why}`)
      return next(e)
    }

    $.ui.toast(DONE_TOAST)
    return { drop: DROP_REASON }
  })
}
