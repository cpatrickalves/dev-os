import { expect, mock, test } from 'claude-code/testing'

const BRIEF = `THE JOB
Write a one-page summary of the Q3 churn numbers for Ben.

THE WHY
For Ben, to use in the Monday team call.

THE GUARDRAILS
- Use the Stripe export from 3 October.
- Keep it under 300 words.

DONE MEANS
- Ben can read it in two minutes and knows the top three reasons.`

const filler =
  'so basically I was thinking about the churn thing and um we need something for Ben for Monday and it should use the Stripe export from the third of October and keep it short like under three hundred words and I want the top three reasons people leave and honestly I keep going back and forth on how much detail to put in because Ben does not like long docs and the team call is only thirty minutes and we also need to make sure the numbers match what Sam said last week about the cohort'

// Typed loosely: the AskUserQuestion matcher's full type is too deep for tsc.
type LooseOn = (event: string, match: object, hook: (_$: unknown, e: { questions: { question: string }[] }) => Promise<unknown>) => void

const longDump = `${filler} ${filler}`.split(/\s+/).slice(0, 150).join(' ')

for (const surface of ['desktop', 'terminal'] as const) {
  test(`shapes a brain dump, sends as is, and skips short or shaped prompts (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const store: Record<string, unknown> = {}
    const files: Record<string, string> = {}
    let answer = 'Shape it'
    let asks = 0
    let modelCalls = 0
    let modelFails = false
    const filled: string[] = []
    const passed: string[] = []

    on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
    on('command.register', async () => ({ value: undefined }) as never)
    on('store.get', async ($, e) => ({ value: store[(e as { key: string }).key] }) as never)
    on('store.set', async ($, e) => {
      const { key, value } = e as { key: string; value: unknown }
      store[key] = value
      return { value: undefined } as never
    })
    on('fs.exists', async ($, e) => ({ value: (e as { path: string }).path in files }) as never)
    on('fs.read', async ($, e) => ({ value: files[(e as { path: string }).path] ?? '' }) as never)
    on('fs.write', async ($, e) => {
      const { path, text } = e as { path: string; text: string }
      files[path] = text
      return { value: undefined } as never
    })
    on('process.run', async () => ({ value: { exitCode: 0, stdout: '', stderr: '' } }) as never)
    on('ui.toast', async () => ({ value: undefined }) as never)
    ;(on as unknown as LooseOn)('tool.call', { tool: 'AskUserQuestion' }, async (_$, e) => {
      asks += 1
      const { questions } = e
      const q = questions[0]?.question ?? ''
      return { result: { questions, answers: { [q]: answer } } }
    })
    on('ui.status', async () => ({ value: undefined }) as never)
    on('model.complete', async ($, e) => {
      modelCalls += 1
      if (modelFails) return { value: { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage: {} } } as never
      const gaps = (e.system ?? '').includes('Return JSON only')
      return { value: { isAnswered: true, text: gaps ? '{"questions":[]}' : BRIEF, usage: {} } } as never
    })
    on('prompt.fill', async ($, e) => {
      filled.push((e as { text: string }).text)
      return { isFilled: true } as never
    })
    on('prompt.submit', async ($, e) => {
      passed.push(e.text)
      return { text: e.text }
    })

    await $.session.start({ source: 'startup', cwd: '/tmp', surface, isInteractive: true } as never)
    const composer = { kind: 'composer' } as const

    // 1. A 150-word dump, answered Shape it: dropped, and the box gets the brief.
    const r1 = await $.prompt.submit({ text: longDump, origin: composer, wait: false } as never)
    expect(asks, 'asked once').toBe(1)
    expect(modelCalls, 'gap check plus brief').toBe(2)
    expect((r1 as { drop?: string }).drop, 'original dropped').toBe('shaped into a brief')
    expect(passed.length, 'nothing sent').toBe(0)
    expect(filled.length, 'box filled once').toBe(1)
    for (const h of ['THE JOB', 'THE WHY', 'THE GUARDRAILS', 'DONE MEANS']) expect(filled[0] ?? '', `brief has ${h}`).toContain(h)

    // 2. Send as is: next gets the original text.
    answer = 'Send as is'
    await $.prompt.submit({ text: longDump, origin: composer, wait: false } as never)
    expect(asks, 'asked again').toBe(2)
    expect(passed[0], 'original sent unchanged').toBe(longDump)
    expect(filled.length, 'box untouched').toBe(1)

    // 3. A 20-word prompt: no ask.
    const short = longDump.split(' ').slice(0, 20).join(' ')
    await $.prompt.submit({ text: short, origin: composer, wait: false } as never)
    expect(asks, 'no ask for 20 words').toBe(2)
    expect(passed[1]).toBe(short)

    // 4. Already shaped: no ask.
    const shaped = `THE JOB\n${longDump}`
    await $.prompt.submit({ text: shaped, origin: composer, wait: false } as never)
    expect(asks, 'no ask when THE JOB is there').toBe(2)
    expect(passed[2]).toBe(shaped)

    // A plugin's own long prompt is left alone.
    await $.prompt.submit({ text: longDump, origin: { kind: 'task-notification' }, wait: false } as never)
    expect(asks, 'no ask for a notification').toBe(2)

    // A failed model call: the original goes through and the log says why.
    answer = 'Shape it'
    modelFails = true
    await $.prompt.submit({ text: longDump, origin: composer, wait: false } as never)
    expect(passed[passed.length - 1], 'original sent after a failure').toBe(longDump)
    const logged = Object.entries(files).find(([k]) => k.endsWith('/.claude/mods-logs/brain-dump.log'))
    expect(logged?.[1] ?? '', 'failure logged').toContain('overloaded')
  })
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`does nothing when switched off in /mods (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    let switches = ''
    let asks = 0
    const passed: string[] = []
    const isSwitches = (e: unknown) => (e as { path: string }).path.endsWith('/.claude/mods/switches.json')
    on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
    on('command.register', async () => ({ value: undefined }) as never)
    const clock = mock.clock(on, { now: 0 })
    on('store.get', async () => ({ value: undefined }) as never)
    on('store.set', async () => ({ value: undefined }) as never)
    on('fs.exists', async ($, e) => ({ value: isSwitches(e) && switches !== '' }) as never)
    on('fs.read', async ($, e) => ({ value: isSwitches(e) ? switches : '' }) as never)
    ;(on as unknown as LooseOn)('tool.call', { tool: 'AskUserQuestion' }, async (_$, e) => {
      asks += 1
      const { questions } = e
      return { result: { questions, answers: { [questions[0]?.question ?? '']: 'Send as is' } } }
    })
    on('prompt.submit', async ($, e) => {
      passed.push(e.text)
      return { text: e.text }
    })
    await $.session.start({ source: 'startup', cwd: '/tmp', surface, isInteractive: true } as never)
    await clock.settle()
    switches = JSON.stringify({ 'brain-dump': false })
    await clock.advance(3100)

    await $.prompt.submit({ text: longDump, origin: { kind: 'composer' }, wait: false } as never)
    expect(asks, 'no offer when off').toBe(0)
    expect(passed[0], 'the dump goes through as typed').toBe(longDump)
    const said = await $.command.run({ command: 'shape', args: '' } as never)
    expect(JSON.stringify(said), 'the command says it is off').toContain('Turn it on with /mods')
  })
}

// The two-step shaper: step A reads for gaps, the questions are asked, step B
// writes the brief with the answers. model.complete answers each call in turn.
type On = Parameters<NonNullable<Parameters<typeof test>[2]>>[1]
type Rig = {
  replies: string[]
  answers: Record<string, string | null>
  calls: number
  asks: { q: string; header: string }[]
  prompts: string[]
  filled: string[]
  statuses: (string | undefined)[]
  files: Record<string, string>
}

function rig(on: On, replies: string[], answers: Record<string, string | null>): Rig {
  const r: Rig = { replies, answers, calls: 0, asks: [], prompts: [], filled: [], statuses: [], files: {} }
  mock.clock(on, { now: 0 })
  on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('store.get', async () => ({ value: undefined }) as never)
  on('store.set', async () => ({ value: undefined }) as never)
  on('fs.exists', async ($, e) => ({ value: (e as { path: string }).path in r.files }) as never)
  on('fs.read', async ($, e) => ({ value: r.files[(e as { path: string }).path] ?? '' }) as never)
  on('fs.write', async ($, e) => {
    const { path, text } = e as { path: string; text: string }
    r.files[path] = text
    return { value: undefined } as never
  })
  on('process.run', async () => ({ value: { exitCode: 0, stdout: '', stderr: '' } }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('ui.status', async ($, e) => {
    r.statuses.push((e as { text: string | undefined }).text)
    return { value: undefined } as never
  })
  ;(on as unknown as LooseOn)('tool.call', { tool: 'AskUserQuestion' }, async (_$, e) => {
    const { questions } = e
    const first = questions[0] as { question: string; header: string }
    r.asks.push({ q: first.question, header: first.header })
    const a = first.question.startsWith('This looks like a brain dump') ? 'Shape it' : r.answers[first.question]
    if (a === null || a === undefined) return { deny: 'dismissed' }
    return { result: { questions, answers: { [first.question]: a } } }
  })
  on('model.complete', async ($, e) => {
    r.prompts.push(e.prompt)
    const text = r.replies[r.calls] ?? BRIEF
    r.calls += 1
    return { value: { isAnswered: true, text, usage: {} } } as never
  })
  on('prompt.fill', async ($, e) => {
    r.filled.push((e as { text: string }).text)
    return { isFilled: true } as never
  })
  on('prompt.submit', async ($, e) => ({ text: e.text }))
  return r
}

const logOf = (r: Rig) => Object.entries(r.files).find(([k]) => k.endsWith('/.claude/mods-logs/brain-dump.log'))?.[1] ?? ''

for (const surface of ['desktop', 'terminal'] as const) {
  test(`zero questions goes straight to the brief (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const r = rig(on, ['{"questions":[]}', BRIEF], {})
    await $.session.start({ source: 'startup', cwd: '/tmp', surface, isInteractive: true } as never)
    const out = await $.prompt.submit({ text: longDump, origin: { kind: 'composer' }, wait: false } as never)
    expect(r.asks.length, 'only the Shape it offer is asked').toBe(1)
    expect(r.prompts.length, 'gap check plus brief').toBe(2)
    expect(r.prompts[1] ?? '', 'no answers block when nothing was asked').not.toContain('<answers>')
    expect((out as { drop?: string }).drop, 'original dropped').toBe('shaped into a brief')
    expect(r.filled[0] ?? '', 'box holds the brief').toContain('THE JOB')
    expect(r.statuses.some(s => s?.includes('reading for gaps')), 'shows reading for gaps').toBe(true)
    expect(r.statuses.some(s => s?.includes('writing the brief')), 'shows writing the brief').toBe(true)
    expect(r.statuses[r.statuses.length - 1], 'status cleared when done').toBe(undefined)
    expect(logOf(r), 'log has the count and time').toMatch(/shaped in \d+\.\ds: 0 questions/)
  })

  test(`two questions are asked and their answers reach the brief prompt (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const q1 = 'Is the summary for Ben only, or the whole team?'
    const q2 = 'When do you need it?'
    const q3 = 'Which Stripe export should I use?'
    const gaps = '```json\n' + JSON.stringify({ questions: [{ q: q1, options: ['Ben only', 'Whole team'] }, { q: q2, options: ['Today', 'Monday'] }] }) + '\n```'
    const r = rig(on, [gaps, BRIEF], { [q1]: 'Ben only', [q2]: 'By Friday noon' })
    await $.session.start({ source: 'startup', cwd: '/tmp', surface, isInteractive: true } as never)
    await $.prompt.submit({ text: longDump, origin: { kind: 'composer' }, wait: false } as never)
    expect(r.asks.length, 'offer plus two questions').toBe(3)
    expect(r.asks[1]?.header, 'first header').toBe('Dump 1 of 2')
    expect(r.asks[2]?.header, 'second header').toBe('Dump 2 of 2')
    const stepB = r.prompts[1] ?? ''
    expect(stepB, 'step B has the dump').toContain(longDump)
    expect(stepB, 'step B has question 1').toContain(q1)
    expect(stepB, 'step B has answer 1').toContain('A: Ben only')
    expect(stepB, 'step B has the typed answer').toContain('A: By Friday noon')
    expect(r.filled.length, 'box filled').toBe(1)
    expect(logOf(r), 'log counts them').toContain('2 questions, 2 answered, 0 skipped')

    // A dismissed question is skipped and marked for "unknown: ask me".
    const gaps2 = JSON.stringify({ questions: [{ q: q1, options: ['Ben only', 'Whole team'] }, { q: q3, options: ['3 October', 'Latest'] }] })
    r.prompts.length = 0
    r.calls = 0
    r.replies = [gaps2, BRIEF]
    r.answers = { [q1]: 'Whole team', [q3]: null }
    await $.prompt.submit({ text: longDump, origin: { kind: 'composer' }, wait: false } as never)
    const stepB2 = r.prompts[1] ?? ''
    expect(stepB2, 'answered one is there').toContain('A: Whole team')
    expect(stepB2, 'skipped one is marked').toContain(`Q: ${q3}\nA: skipped, no answer`)
    expect(stepB2, 'skipped means unknown: ask me').toContain('unknown: ask me')
    expect(r.asks.length, 'offer plus two more questions').toBe(6)
    expect(r.filled.length, 'still makes a brief').toBe(2)
    expect(logOf(r), 'log counts the skip').toContain('2 questions, 1 answered, 1 skipped')
  })

  test(`bad JSON from the gap check still makes a brief (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const r = rig(on, ['Sure! I think the dump is mostly clear, maybe ask about the deadline.', BRIEF], {})
    await $.session.start({ source: 'startup', cwd: '/tmp', surface, isInteractive: true } as never)
    const out = await $.prompt.submit({ text: longDump, origin: { kind: 'composer' }, wait: false } as never)
    expect(r.asks.length, 'no questions after bad JSON').toBe(1)
    expect(r.prompts.length, 'brief still written').toBe(2)
    expect((out as { drop?: string }).drop, 'original dropped').toBe('shaped into a brief')
    expect(r.filled[0] ?? '', 'box holds the brief').toContain('DONE MEANS')
    expect(logOf(r), 'parse failure logged').toContain('gap check parse failed')
    expect(r.statuses[r.statuses.length - 1], 'status cleared').toBe(undefined)
  })
}
