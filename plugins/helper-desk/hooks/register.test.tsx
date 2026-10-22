import { expect, mock, test } from 'claude-code/testing'

/** The `on` a test body is handed. */
type On = Parameters<NonNullable<Parameters<typeof test>[2]>>[1]

type Agent = { id: string; description: string; type: string; status: string }

/** The file `path` names: exact, or a key led by a star that any home can end with. */
const keyOf = (files: Record<string, string>, path: string) =>
  path in files ? path : Object.keys(files).find(k => k.startsWith('*') && path.endsWith(k.slice(1)))

/** Each tool spec the mod registered, newest test only. */
let specs: { isDeferred?: boolean }[] = []

/** Mocks every $ call the mod makes; `files` stands in for the disk. */
function rig(on: On, files: Record<string, string>) {
  const ids = ['agent-a1', 'agent-a2', 'agent-a3']
  const agents: Agent[] = []
  const statuses: (string | undefined)[] = []
  const opened: string[] = []
  const closed: string[] = []
  const ran: string[][] = []
  const toasts: string[] = []

  on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
  on('session.id', async () => ({ value: 'sess1' }) as never)
  on('session.usage', async () => ({ value: { startedAt: 0, context: {}, rateLimits: [], cost: { usd: 0.42 } } }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('tool.register', async ($, e) => {
    specs.push(e as { isDeferred?: boolean })
    return { value: { tool: 'mcp__helper-desk__plan' } } as never
  })
  const clock = mock.clock(on, { now: 1_000_000 })
  on('agent.spawn', async ($, e) => {
    const { description, subagentType } = e as { description: string; subagentType: string }
    const id = ids[agents.length]!
    agents.push({ id, description, type: subagentType, status: 'running' })
    return { model: 'claude-opus-5-5', agentId: id } as never
  })
  on('agent.list', async () => ({ value: agents.map(a => ({ ...a })) }) as never)
  on('ui.open', async ($, e) => {
    opened.push((e as { id: string }).id)
    return { value: { isPlaced: true } } as never
  })
  on('ui.close', async ($, e) => {
    closed.push((e as { id: string }).id)
    return { value: undefined } as never
  })
  on('ui.status', async ($, e) => {
    statuses.push((e as { text: string | undefined }).text)
    return { value: undefined } as never
  })
  on('ui.toast', async ($, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  on('tool.call', async () => ({ result: 'ok' }) as never)
  // Beneath the plugins a pane nobody draws is empty.
  on('ui.render', async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return (<Box />) as never
  })
  on('turn.complete', async () => ({ text: '' }) as never)
  on('fs.exists', async ($, e) => ({ value: keyOf(files, (e as { path: string }).path) !== undefined }) as never)
  on('fs.read', async ($, e) => ({ value: files[keyOf(files, (e as { path: string }).path) ?? ''] ?? '' }) as never)
  on('fs.write', async ($, e) => {
    const { path, text } = e as { path: string; text: string }
    files[path] = text
    return { value: undefined } as never
  })
  on('process.run', async ($, e) => {
    const argv = (e as { argv?: string[]; command?: string[] }).argv ?? (e as { command?: string[] }).command ?? []
    ran.push(argv)
    const hit = argv[0] === 'rm' ? keyOf(files, argv[argv.length - 1]!) : undefined
    if (hit) delete files[hit]
    return { value: { exitCode: 0, stdout: '', stderr: '' } } as never
  })
  return { agents, statuses, opened, closed, ran, clock, toasts }
}

/** What the band says: the drawing's alt text on desktop, every text in the terminal. */
async function bandSays(v: { find: (q: object) => Promise<unknown>; findAll: (q: object) => Promise<unknown[]> }, surface: 'desktop' | 'terminal') {
  if (surface === 'desktop') {
    const svg = (await v.find({ type: 'Svg' })) as { props: { alt?: string } } | undefined
    return svg ? String(svg.props.alt) : ''
  }
  return ((await v.findAll({ type: 'Text' })) as { text: string }[]).map(t => t.text).join(' ')
}

const bandProps = (bodyColumns = 40) => ({ isWorking: true, hasSurvey: false, maxRows: 20, bodyColumns, scroll: {}, view: {} }) as never

/** The plan file this chat writes, whatever the home. */
const planFile = (files: Record<string, string>) => Object.keys(files).find(k => k.endsWith('/.claude/mods-state/plan-sess1.json'))

const steps4 = (done: number, live: boolean) =>
  ['Read the brief', 'Draft the outline', 'Build the slides', 'Check the deck'].map((text, i) => ({
    text,
    status: i < done ? 'completed' : i === done && live ? 'in_progress' : 'pending',
  }))

const props = (bodyColumns = 60) =>
  ({ title: 'Helpers', isFocused: false, bodyColumns, placement: 'dock', scroll: {}, view: {} }) as never

for (const surface of ['desktop', 'terminal'] as const) {
  test(`two helpers get live cards, then both are done (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const { agents, statuses, opened, clock } = rig(on, {})
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    // A plain signature: the connector-typed one is too deep for tsc.
    const callTool = $.tool.call as unknown as (input: unknown) => Promise<unknown>

    const spawn = (description: string, subagentType: string, model: string, n: number) =>
      $.agent.spawn({ tool_use_id: `spawn${n}`, prompt: 'Do the job.', description, subagentType, model } as never)
    await spawn('Read the research notes', 'Explore', 'haiku', 1)
    await spawn('Find invoice threads', 'general-purpose', 'opus', 2)
    await clock.settle()
    expect(opened, 'pane opened by itself').toContain('helpers')

    await callTool({ tool: 'Read', tool_use_id: 'c1', file_path: '/Users/test/vault/research.md', agentId: 'agent-a1' } as never)
    await callTool({ tool: 'mcp__00000000-0000-0000-0000-00000000000a__search_threads', tool_use_id: 'c2', query: 'invoice', agentId: 'agent-a2' } as never)
    await clock.advance(5_000)

    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props() })
    expect(await v.find({ text: /Read the research notes/ }), 'first description').toBeDefined()
    expect(await v.find({ text: /Find invoice threads/ }), 'second description').toBeDefined()
    expect(await v.find({ text: /Step 1 · Reading research\.md/ }), 'Read in words').toBeDefined()
    expect(await v.find({ text: /Gmail: search threads/ }), 'Gmail connector in words').toBeDefined()
    expect(await v.find({ type: 'Text', text: /^Running · 2\s*$/ }), 'Running heading with its count').toBeDefined()
    const runHead = await v.find({ key: 'head-running' })
    expect(runHead?.props.backgroundColor, 'Running sits in a green box').toBe('#16a34a')
    expect(await v.find({ text: /Explore · Haiku/ }), 'type and model').toBeDefined()
    expect(await v.find({ text: /^Time$/ }), 'time tile').toBeDefined()
    expect(await v.find({ type: 'Text', text: /^Total chat cost$/ }), 'Total chat cost label').toBeDefined()
    expect(await v.find({ text: /\$0\.42/ }), 'chat cost from the engine').toBeDefined()
    expect(await v.find({ text: /^Subagent tokens$/ }), 'no tokens tile before any usage').toBeUndefined()
    expect(statuses.every(t => t === undefined), 'no footer status line').toBe(true)

    const usage = { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 30000, cache_creation_input_tokens: 2000, model: 'claude-opus-5-5' }
    await $.turn.complete({ answer: 'Found it.', agentId: 'agent-a1', reason: 'answer', durationMs: 4000, isAborted: false, turnId: 't1', usage } as never)
    await clock.settle()
    expect(await v.find({ type: 'Text', text: /^Finished · 1\s*$/ }), 'Finished heading with its count').toBeDefined()
    expect((await v.find({ key: 'head-finished' }))?.props.backgroundColor, 'Finished sits in a yellow box').toBe('#eab308')
    expect(await v.find({ text: /^Subagent tokens$/ }), 'subagent tokens tile from usage').toBeDefined()
    expect(await v.find({ text: /34k tokens/ }), 'card tokens').toBeDefined()
    expect(statuses[statuses.length - 1], 'still no footer status').toBeUndefined()

    // The 2 s poll sees the second helper finish from $.agent.list().
    agents[1]!.status = 'completed'
    await clock.advance(2_100)
    expect(await v.find({ type: 'Text', text: /^Finished · 2\s*$/ }), 'both finished from the poll').toBeDefined()
    expect(await v.find({ key: 'head-running' }), 'running group gone').toBeUndefined()
    expect(statuses[statuses.length - 1], 'status cleared').toBeUndefined()
  })

  test(`two helpers get two body colours, and only running pets move (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const { clock } = rig(on, {})
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'Build the landing page', subagentType: 'general-purpose' } as never)
    await $.agent.spawn({ tool_use_id: 's2', prompt: 'x', description: 'Design the graphics', subagentType: 'general-purpose' } as never)
    await clock.settle()
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props() })
    if (surface === 'terminal') {
      const tops = await v.findAll({ type: 'Text', text: /^ (▟█▙|▜█▛)$/ })
      expect(tops, 'two glyph pets').toHaveLength(2)
      expect(tops[0]!.props.color !== tops[1]!.props.color, 'pets in different colours').toBe(true)
      expect(await v.findAll({ type: 'Svg' }), 'no Svg on the terminal').toHaveLength(0)
      const before = tops[0]!.text
      await clock.advance(600)
      const after = (await v.findAll({ type: 'Text', text: /^ (▟█▙|▜█▛)$/ }))[0]!.text
      expect(after !== before, 'a running glyph pet moves').toBe(true)
      return
    }
    const pets = (await v.findAll({ type: 'Svg' })).filter(p => String(p.props.alt).startsWith('Claude crab'))
    expect(pets, 'two pets').toHaveLength(2)
    const a = String(pets[0]!.props.source)
    const b = String(pets[1]!.props.source)
    expect(a.startsWith('<svg'), 'an svg document').toBe(true)
    expect(a.includes('#dc2626'), 'first helper is red').toBe(true)
    expect(b.includes('#ea580c'), 'second helper is orange').toBe(true)
    expect(a.includes('#2b1d16') && b.includes('#2b1d16'), 'same eyes and outline').toBe(true)
    expect(a.length < 131072, 'under the Svg limit').toBe(true)
    expect(String(pets[0]!.props.alt), 'alt names the colour').toBe('Claude crab, red')
    expect(Number(pets[0]!.props.width) >= 48, 'a bigger pet').toBe(true)

    // Running: the frame changes on the clock tick.
    const frames = new Set<string>()
    for (let i = 0; i < 4; i += 1) {
      frames.add(String((await v.findAll({ type: 'Svg' })).filter(p => String(p.props.alt).startsWith('Claude crab'))[0]!.props.source))
      await clock.advance(600)
    }
    expect(frames.size >= 2, 'a running pet cycles frames').toBe(true)

    // Finished: it stands still.
    await $.turn.complete({ answer: 'ok', agentId: 'agent-a1', reason: 'answer', durationMs: 1, isAborted: false, turnId: 't1' } as never)
    await clock.settle()
    const still = async () => String((await v.findAll({ type: 'Svg' })).find(p => String(p.props.alt).endsWith('red'))?.props.source)
    const first = await still()
    await clock.advance(600)
    expect(await still(), 'a finished pet is still').toBe(first)
    await clock.advance(600)
    expect(await still(), 'still after another tick').toBe(first)
  })

  test(`a new helper never takes a running helper's colour (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const { clock, agents } = rig(on, {})
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'One', subagentType: 'general-purpose' } as never)
    await $.agent.spawn({ tool_use_id: 's2', prompt: 'x', description: 'Two', subagentType: 'general-purpose' } as never)
    await clock.settle()
    expect(agents, 'two spawned').toHaveLength(2)
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props() })
    const colours = async () =>
      surface === 'terminal'
        ? (await v.findAll({ type: 'Text', text: /^ (▟█▙|▜█▛)$/ })).map(t => String(t.props.color))
        : (await v.findAll({ type: 'Svg' })).filter(p => String(p.props.alt).startsWith('Claude crab')).map(p => String(p.props.alt).replace('Claude crab, ', ''))
    const got = await colours()
    expect(new Set(got).size, 'two different colours').toBe(2)

    // One finishes, a third starts: it takes the next colour in order, never the running one's.
    await $.turn.complete({ answer: 'ok', agentId: 'agent-a1', reason: 'answer', durationMs: 1, isAborted: false, turnId: 't1' } as never)
    await $.agent.spawn({ tool_use_id: 's3', prompt: 'x', description: 'Three', subagentType: 'general-purpose' } as never)
    await clock.settle()
    const all = await colours()
    expect(all, 'three pets').toHaveLength(3)
    expect(new Set(all).size, 'three different colours').toBe(3)
    if (surface === 'desktop') expect(all, 'third is yellow').toContain('yellow')
  })

  test(`connector steps are named from the server or the tool names, never a raw id (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const { clock } = rig(on, {})
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    const callTool = $.tool.call as unknown as (input: unknown) => Promise<unknown>
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'Check the tools', subagentType: 'general-purpose' } as never)
    await clock.settle()
    // Made-up ids: on a real account each claude.ai connector has its own random id.
    const kit = 'mcp__00000000-0000-0000-0000-0000000000c1__'
    const calls = [
      { tool: `${kit}list_landing_pages` },
      // list_posts alone could be Kit or Circle; this server already showed it is Kit.
      { tool: `${kit}list_posts` },
      { tool: 'mcp__00000000-0000-0000-0000-0000000000c2__list_spaces' },
      { tool: 'mcp__00000000-0000-0000-0000-0000000000c3__notion-search', query: 'roadmap' },
      { tool: 'mcp__plugin_demo_fireflies__fireflies_search', query: 'kickoff' },
      { tool: 'mcp__claude_ai_Slack__slack_search_public', query: 'launch' },
      { tool: 'mcp__00000000-0000-0000-0000-0000000000c5__do_something_new' },
    ]
    let n = 0
    for (const c of calls) await callTool({ ...c, tool_use_id: `c${(n += 1)}`, agentId: 'agent-a1' } as never)
    await clock.advance(1_000)

    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props(70) })
    await v.press({ key: 'steps-agent-a1' })
    for (const label of [
      /^Kit · list landing pages/,
      /^Kit · list posts/,
      /^Circle · list spaces/,
      /^Notion · search/,
      /^Fireflies · search/,
      /^Slack · search public/,
      /^Connector · do something new/,
    ]) {
      expect(await v.find({ text: label }), String(label)).toBeDefined()
    }
    expect(await v.find({ text: /00000000/ }), 'no raw server id').toBeUndefined()
  })

  test(`pressing a card's toggle shows its full step list (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const { clock } = rig(on, {})
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    const callTool = $.tool.call as unknown as (input: unknown) => Promise<unknown>
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'Prep the video', subagentType: 'general-purpose' } as never)
    await clock.settle()
    const calls = [
      { tool: 'Read', file_path: '/Users/test/vault/YouTube/videos/mods/pre-outline.md' },
      { tool: 'Bash', command: 'ls -la /tmp', description: 'List the temp folder' },
      { tool: 'mcp__00000000-0000-0000-0000-00000000000b__list_recent_files' },
      { tool: 'Skill', skill: 'video-prep' },
      { tool: 'WebFetch', url: 'https://docs.example.com/page', prompt: 'read' },
      { tool: 'Write', file_path: '/Users/test/vault/YouTube/videos/mods/research.md', content: 'x' },
    ]
    let n = 0
    for (const c of calls) await callTool({ ...c, tool_use_id: `c${(n += 1)}`, agentId: 'agent-a1' } as never)
    await clock.advance(1_000)

    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props(70) })
    expect(await v.find({ text: /Step 6 · Writing research\.md/ }), 'live line').toBeDefined()
    expect(await v.find({ text: /Opening docs\.example\.com/ }), 'last steps under the live line').toBeDefined()
    expect(await v.find({ text: /pre-outline\.md/ }), 'collapsed hides older steps').toBeUndefined()
    expect((await v.find({ key: 'steps-agent-a1' }))?.text ?? '', 'toggle').toContain('All 6 steps')

    await v.press({ key: 'steps-agent-a1' })
    expect((await v.find({ key: 'steps-agent-a1' }))?.text ?? '', 'toggle open').toContain('Hide steps')
    expect(await v.find({ text: /^File read$/ }), 'kind tag').toBeDefined()
    expect(await v.find({ text: /^pre-outline\.md/ }), 'first step listed').toBeDefined()
    expect(await v.find({ text: /YouTube\/videos\/mods/ }), 'folder in dim text').toBeDefined()
    expect(await v.find({ text: /^List the temp folder/ }), 'command by its description').toBeDefined()
    expect(await v.find({ text: /^Google Drive · list recent files/ }), 'connector name and tool').toBeDefined()
    expect(await v.find({ text: /^video-prep/ }), 'skill name').toBeDefined()
    expect(await v.find({ text: /^docs\.example\.com/ }), 'web host').toBeDefined()
    expect(await v.find({ text: /^File write$/ }), 'write tag').toBeDefined()

    await v.press({ key: 'steps-agent-a1' })
    expect(await v.find({ text: /^File read$/ }), 'closed again').toBeUndefined()
  })

  test(`switches.json false: the pane draws nothing of its own (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = {}
    const { opened, closed, clock } = rig(on, files)
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'Build the landing page', subagentType: 'general-purpose' } as never)
    await clock.settle()
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props() })
    expect(await v.find({ text: /Build the landing page/ }), 'drawn while on').toBeDefined()

    // The switchboard writes the file; the 3 s poll reads it.
    files['*/.claude/mods/switches.json'] = JSON.stringify({ 'helper-desk': false })
    await clock.advance(3_100)
    expect(closed, 'pane closed').toContain('helpers')
    expect(await v.find({ text: /Build the landing page/ }), 'no card').toBeUndefined()
    expect(await v.find({ text: /helper/i }), 'nothing of its own').toBeUndefined()
    const r = await $.command.run({ command: 'helpers', args: '' } as never)
    expect(String((r as { text?: string }).text), 'command says off').toContain('Helper Desk is off')

    // An open request is used up but opens nothing while off; on again, it opens.
    const before = opened.length
    files['*/.claude/mods/.open-helper-desk-sess1'] = ''
    await clock.advance(3_100)
    expect(opened.length, 'no open while off').toBe(before)
    expect('*/.claude/mods/.open-helper-desk-sess1' in files, 'request used up while off').toBe(false)
    files['*/.claude/mods/switches.json'] = '{}'
    files['*/.claude/mods/.open-helper-desk-sess1'] = ''
    await clock.advance(3_100)
    expect(opened.length, 'open request answered').toBe(before + 1)
    expect('*/.claude/mods/.open-helper-desk-sess1' in files, 'request file removed').toBe(false)
  })

  test(`each card has one thick sparkle bar (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const { clock } = rig(on, {})
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'Build the landing page', subagentType: 'general-purpose' } as never)
    await clock.settle()
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props() })
    expect(await v.find({ text: /[─━]/ }), 'no thin two-line bar').toBeUndefined()
    if (surface === 'desktop') {
      const bars = (await v.findAll({ type: 'Svg' })).filter(b => b.props.alt === 'Working')
      expect(bars, 'one bar for the card').toHaveLength(1)
      expect(bars[0]!.props.height, 'thick').toBe(10)
      expect(bars[0]!.props.source, 'sparkles twinkle').toContain('@keyframes tw')
    } else {
      expect(await v.find({ text: /^[█░]{20,}$/ }), 'one bar of thick blocks').toBeDefined()
    }
  })

  test(`Hide in the pane writes the shared flag and closes it (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = {}
    const { opened, closed, clock } = rig(on, files)
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'Build the landing page', subagentType: 'general-purpose' } as never)
    await clock.settle()
    expect(opened, 'opened by itself').toContain('helpers')
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props() })
    await v.press({ key: 'hide' })
    const sw = Object.keys(files).find(k => k.endsWith('/.claude/mods/switches.json')) ?? ''
    expect(JSON.parse(files[sw] ?? '{}'), 'Hide writes the shared flag').toEqual({ 'helper-desk:hidden': true })
    expect(closed, 'the pane closes').toContain('helpers')
  })

  test(`hidden, it does not open by itself; cleared, Show opens it (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = { '*/.claude/mods/switches.json': JSON.stringify({ 'helper-desk:hidden': true }) }
    const { opened, clock } = rig(on, files)
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'Build the landing page', subagentType: 'general-purpose' } as never)
    await clock.settle()
    expect(opened, 'no auto open while hidden').not.toContain('helpers')

    files['*/.claude/mods/switches.json'] = '{}'
    files['*/.claude/mods/.open-helper-desk-sess1'] = ''
    await clock.advance(3_100)
    expect(opened, 'Show opens the pane').toContain('helpers')
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'Pane', requestId: 'helpers', props: props() })
    expect(await v.find({ text: /Build the landing page/ }), 'the card draws').toBeDefined()
  })

  test(`the plan tool writes the plan file and draws "2 of 4" (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = {}
    const { clock, ran } = rig(on, files)
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    const callTool = $.tool.call as unknown as (input: unknown) => Promise<{ result?: unknown }>
    const said = await callTool({ tool: 'mcp__helper-desk__plan', tool_use_id: 'p1', title: 'Make the deck', steps: steps4(2, true) })
    await clock.settle()
    expect(String(said.result), 'tool answer').toBe('Plan saved: 2 of 4 steps done.')
    const path = planFile(files)
    expect(path, 'plan file written').toBeDefined()
    expect(ran.some(a => a[0] === 'mkdir' && String(a[a.length - 1]).endsWith('/.claude/mods-state')), 'state folder made').toBe(true)
    const saved = JSON.parse(files[path!]!) as { title: string; steps: { text: string; status: string; doneAt?: string }[]; updatedAt: string }
    expect(saved.title, 'title saved').toBe('Make the deck')
    expect(saved.steps.map(st => st.status), 'statuses saved').toEqual(['completed', 'completed', 'in_progress', 'pending'])
    expect(typeof saved.steps[0]!.doneAt, 'done steps carry a time').toBe('string')
    expect(typeof saved.updatedAt, 'updatedAt').toBe('string')

    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'AbovePrompt', props: bandProps(80) })
    const says = await bandSays(v, surface)
    expect(says, 'plan title').toContain('Make the deck')
    expect(says, 'count').toContain('Tasks 2/4')
    expect(says, 'percent').toContain('50%')
    expect(await v.find({ type: 'Text', text: /^Now: Build the slides$/ }), 'current step under the bar').toBeDefined()
    if (surface === 'desktop') {
      const svg = String((await v.find({ type: 'Svg' }))!.props.source)
      expect(svg, 'purple gradient').toContain('#6d28d9')
      expect(svg, 'sparkles twinkle').toContain('@keyframes tw')
      expect(svg, 'the step in progress glows').toContain('class="lv"')
    } else {
      const cells = await v.findAll({ text: /^█$/ })
      expect(cells, 'half the bar is filled').toHaveLength(23)
      expect(cells[0]!.props.color, 'light purple at the start').toBe('#c4b5fd')
      expect(cells[22]!.props.color, 'deep purple at the head').toBe('#6d28d9')
      const live1 = String((await v.find({ text: /^▓+$/ }))!.props.color)
      await clock.advance(360)
      const live2 = String((await v.find({ text: /^▓+$/ }))!.props.color)
      expect(live1 !== live2, 'the step in progress shimmers').toBe(true)
    }

    // The bar follows the plan, not subagents: a running subagent adds nothing to it.
    await $.agent.spawn({ tool_use_id: 's1', prompt: 'x', description: 'Build the slides', subagentType: 'general-purpose' } as never)
    await clock.settle()
    expect(await v.find({ text: /subagent/i }), 'no subagent line').toBeUndefined()

    // The ✕ hides the bar; the next plan update brings it back.
    await v.press({ key: 'plan-dismiss' })
    expect(await v.find({ key: 'plan-band' }), 'dismissed').toBeUndefined()
    await callTool({ tool: 'mcp__helper-desk__plan', tool_use_id: 'p2', title: 'Make the deck', steps: steps4(3, true) })
    await clock.settle()
    expect(await bandSays(v, surface), 'back on the next update').toContain('Tasks 3/4')
  })

  test(`a TodoWrite call on the main chat is mirrored into the plan (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = {}
    const { clock } = rig(on, files)
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    const callTool = $.tool.call as unknown as (input: unknown) => Promise<unknown>
    const todos = [
      { content: 'Pull the numbers', status: 'completed', activeForm: 'Pulling the numbers' },
      { content: 'Write the summary', status: 'in_progress', activeForm: 'Writing the summary' },
      { content: 'Send the link', status: 'pending', activeForm: 'Sending the link' },
    ]
    // A subagent's list is its own: it stays out of the plan.
    await callTool({ tool: 'TodoWrite', tool_use_id: 't0', todos, agentId: 'agent-x' })
    await clock.settle()
    expect(planFile(files), 'no plan from a subagent').toBeUndefined()

    await callTool({ tool: 'TodoWrite', tool_use_id: 't1', todos })
    await clock.settle()
    const saved = JSON.parse(files[planFile(files)!]!) as { steps: { text: string; status: string }[] }
    expect(saved.steps.map(st => st.text), 'todos mirrored').toEqual(['Pull the numbers', 'Write the summary', 'Send the link'])
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'AbovePrompt', props: bandProps() })
    expect(await bandSays(v, surface), 'band from TodoWrite').toContain('Tasks 1/3')
    expect(await v.find({ type: 'Text', text: /^Now: Write the summary$/ }), 'current todo').toBeDefined()
  })

  test(`a step finishing raises a toast, and a finished plan holds 20 s then hides (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const { clock, toasts } = rig(on, {})
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    const callTool = $.tool.call as unknown as (input: unknown) => Promise<unknown>
    const plan = (steps: unknown, n: number) => callTool({ tool: 'mcp__helper-desk__plan', tool_use_id: `p${n}`, title: 'Make the deck', steps })
    await plan(steps4(1, true), 1)
    await clock.settle()
    expect(toasts, 'no toast for steps already done in a new plan').toHaveLength(0)
    await plan(steps4(2, true), 2)
    await clock.settle()
    expect(toasts, 'the step that finished').toEqual(['Done: Draft the outline'])

    await plan(steps4(4, false), 3)
    await clock.settle()
    expect(toasts[toasts.length - 1], 'whole plan done').toBe('All 4 steps done.')
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'AbovePrompt', props: bandProps() })
    expect(await bandSays(v, surface), 'held at 100%').toContain('100%')
    await clock.advance(19_000)
    expect(await v.find({ key: 'plan-band' }), 'still there before 20 s').toBeDefined()
    await clock.advance(1_500)
    expect(await v.find({ key: 'plan-band' }), 'gone after 20 s').toBeUndefined()

    // A new plan brings the band back.
    await plan(steps4(0, true), 4)
    await clock.settle()
    expect(await bandSays(v, surface), 'new plan shows').toContain('Tasks 0/4')
  })

  test(`off or hidden: the band draws nothing of its own (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = {}
    const { clock } = rig(on, files)
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    const callTool = $.tool.call as unknown as (input: unknown) => Promise<{ result?: unknown }>
    await callTool({ tool: 'mcp__helper-desk__plan', tool_use_id: 'p1', steps: steps4(1, true) })
    await clock.settle()
    const v = await $.ui.mount({ plugin: 'helper-desk', surface, component: 'AbovePrompt', props: bandProps() })
    expect(await v.find({ key: 'plan-band' }), 'drawn while on').toBeDefined()

    files['*/.claude/mods/switches.json'] = JSON.stringify({ 'helper-desk:hidden': true })
    await clock.advance(3_100)
    expect(await v.find({ key: 'plan-band' }), 'hidden: no band').toBeUndefined()

    files['*/.claude/mods/switches.json'] = JSON.stringify({ 'helper-desk': false })
    await clock.advance(3_100)
    expect(await v.find({ key: 'plan-band' }), 'off: no band').toBeUndefined()
    expect(await v.find({ text: /Tasks|steps/ }), 'off: nothing of its own').toBeUndefined()
    const said = await callTool({ tool: 'mcp__helper-desk__plan', tool_use_id: 'p2', steps: steps4(2, true) })
    expect(String(said.result), 'the tool says it is off').toContain('off')
  })
}

test('the plan tool sits in front, and work without a plan gets one nudge', { timeoutMs: 30000 }, async ($, on) => {
  specs = []
  const files: Record<string, string> = {}
  const { clock } = rig(on, files)
  await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface: 'desktop', isInteractive: true } as never)
  await clock.settle()
  expect(specs[0]?.isDeferred, 'not behind ToolSearch').toBe(false)

  const callTool = $.tool.call as unknown as (input: unknown) => Promise<{ result?: unknown; context?: string[] }>
  const first = await callTool({ tool: 'Bash', tool_use_id: 'b1', command: 'ls' })
  expect((first.context ?? []).join(' '), 'no plan yet: nudge').toContain('mcp__helper-desk__plan')
  const second = await callTool({ tool: 'Bash', tool_use_id: 'b2', command: 'ls' })
  expect(second.context ?? [], 'only once a turn').toHaveLength(0)

  await callTool({ tool: 'mcp__helper-desk__plan', tool_use_id: 'p1', steps: steps4(0, true) })
  const after = await callTool({ tool: 'Read', tool_use_id: 'r1', file_path: '/x' })
  expect(after.context ?? [], 'plan made: quiet').toHaveLength(0)
  expect(planFile(files), 'plan file written for Chat Inventory').toBeDefined()
})
