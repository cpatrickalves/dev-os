import { expect, mock, test } from 'claude-code/testing'

type On = Parameters<NonNullable<Parameters<typeof test>[2]>>[1]

const MEMORY = [
  { path: '/Users/test/vault/CLAUDE.md', type: 'Project', tokens: 500 },
  { path: '/Users/test/dev/browser-harness/SKILL.md', type: 'User', tokens: 300 },
]

/**
 * The fake disk's key for a path. The mod finds the home folder as the part of its own folder before
 * /.claude/ (the whole folder when run from anywhere else), so everything under home/.claude/ is keyed
 * as ~/.claude/... and the tests pass wherever the package sits.
 */
const disk = (p: string) => {
  const at = p.indexOf('/.claude/')
  return at === -1 ? p : `~${p.slice(at)}`
}

/** Mocks every $ call the mod makes. `files` is the fake disk. */
function setup(on: On, files: Record<string, string>, opened: string[], runs: string[][]) {
  on('session.start', async ($, e) => ({ cwd: e.cwd }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('command.list', async () => ({ value: [] }) as never)
  const clock = mock.clock(on, { now: 1_000_000 })
  on('session.id', async () => ({ value: 'sid' }) as never)
  on('session.cwd', async () => ({ value: '/Users/test/vault' }) as never)
  on('session.messages', async () => ({ value: [] }) as never)
  on('session.usage', async () =>
    ({
      value: {
        context: {
          tokens: 1000,
          window: 1_000_000,
          breakdown: {
            memoryFiles: MEMORY,
            skills: { totalSkills: 1, includedSkills: 1, tokens: 10, skillFrontmatter: [{ name: 'video-prep', source: 'userSettings', tokens: 10 }] },
          },
        },
      },
    }) as never,
  )
  on('fs.exists', async ($, e) => ({ value: disk((e as { path: string }).path) in files }) as never)
  on('fs.read', async ($, e) => ({ value: files[disk((e as { path: string }).path)] ?? '' }) as never)
  on('fs.write', async ($, e) => {
    const { path, text } = e as { path: string; text: string }
    files[disk(path)] = text
    return { value: undefined } as never
  })
  on('process.run', async ($, e) => {
    const argv = [...(e as { argv: readonly string[] }).argv]
    runs.push(argv)
    if (argv[0] === 'rm') delete files[disk(argv[2]!)]
    return { value: { exitCode: 0, stdout: '', stderr: '' } } as never
  })
  on('ui.invalidate', async () => ({ value: undefined }) as never)
  on('ui.open', async ($, e) => {
    opened.push((e as { id: string }).id)
    return { value: { id: (e as { id: string }).id } } as never
  })
  on('ui.close', async ($, e) => {
    opened.push(`closed:${(e as { id: string }).id}`)
    return { value: undefined } as never
  })
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok' }) as never)
  return clock
}

const paneProps = { title: 'In this chat', isFocused: false, bodyColumns: 48, placement: 'dock' } as never

for (const surface of ['desktop', 'terminal'] as const) {
  test(`lists connectors, files and skills in the pane (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const opened: string[] = []
    const clock = setup(on, {}, opened, [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()

    // A loose signature: the full tool-input union is too heavy for tsc here.
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({ tool: 'mcp__00000000-0000-0000-0000-00000000000a__search_threads', tool_use_id: 't1', query: 'offer' })
    await call({ tool: 'mcp__00000000-0000-0000-0000-00000000000a__search_threads', tool_use_id: 't2', query: 'offer 2' })
    await call({ tool: 'mcp__00000000-0000-0000-0000-00000000000b__fireflies_get_transcript', tool_use_id: 't3', transcriptId: 'x' })
    await call({ tool: 'Read', tool_use_id: 't4', file_path: '/Users/test/x/offer.md' })
    await call({ tool: 'Skill', tool_use_id: 't5', skill: 'video-prep' })
    await clock.settle()

    expect(opened, 'the pane opened by itself').toContain('chat-inventory')

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    for (const text of ['Gmail', 'Fireflies', 'offer.md', 'video-prep', 'CLAUDE.md', 'auto', 'browser-harness', 'always loaded']) {
      expect(await ui.find({ text: new RegExp(text) }), `${text} shows`).toBeDefined()
    }
    expect(await ui.find({ text: /SKILL\.md/ }), 'a SKILL.md is not a context file').toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /None used yet/ }), 'no empty box').toBeUndefined()
    expect(await ui.find({ text: /Slack/ }), 'an unused connector does not show').toBeUndefined()
    if (surface === 'desktop') {
      const logos = await ui.findAll({ type: 'Svg' })
      expect(logos.length, 'one logo per connector').toBe(2)
      expect(String(logos.find(l => String(l.props.alt).startsWith('Gmail'))?.props.alt), 'Gmail badge').toContain('2 calls')
      expect(String(logos.find(l => String(l.props.alt).startsWith('Fireflies'))?.props.source), 'a letter tile').toContain('>F</text>')
    } else {
      expect(await ui.find({ type: 'Text', text: /^2 calls$/ }), 'Gmail has two calls').toBeDefined()
      expect(await ui.find({ type: 'Text', text: /^1 call$/ }), 'Fireflies has one call').toBeDefined()
    }
  })

  test(`a gws Bash call is a CLI connector; a SKILL.md read is a skill (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const clock = setup(on, {}, [], [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({ tool: 'Bash', tool_use_id: 'b1', command: `cd ~; gws gmail users messages list --params '{"userId":"me","q":"from:sam"}'` })
    await call({ tool: 'Bash', tool_use_id: 'b2', command: `cd ~ && gws calendar events list --params '{"calendarId":"primary"}'` })
    await call({ tool: 'Bash', tool_use_id: 'b3', command: 'echo gwsx; ls ~/gws' })
    await call({ tool: 'Read', tool_use_id: 'r1', file_path: '/Users/test/.claude/skills/foo/SKILL.md' })
    await clock.settle()

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    expect(await ui.find({ text: /Gmail/ }), 'gws gmail is Gmail').toBeDefined()
    expect(await ui.find({ text: /Google Calendar/ }), 'gws calendar is Google Calendar').toBeDefined()
    expect(await ui.find({ text: /via CLI/ }), 'tagged via CLI').toBeDefined()
    expect(await ui.find({ text: /Google Workspace/ }), 'gwsx is not gws').toBeUndefined()
    expect(await ui.find({ text: /^\/?foo$|foo/ }), 'the skill is named for its folder').toBeDefined()
    expect(await ui.find({ text: /SKILL\.md/ }), 'not a context file').toBeUndefined()
  })

  test(`pressing a connector shows its calls; pressing again hides them (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const clock = setup(on, {}, [], [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({ tool: 'mcp__00000000-0000-0000-0000-00000000000a__search_threads', tool_use_id: 't1', query: 'offer from Sam' })
    await call({ tool: 'mcp__00000000-0000-0000-0000-00000000000b__fireflies_get_transcript', tool_use_id: 't2', transcriptId: '01M46QSH' })
    await clock.settle()

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    expect(await ui.find({ text: /search threads/ }), 'closed at first').toBeUndefined()
    await ui.press({ key: 'c:gmail' })
    expect(await ui.find({ text: /search threads/ }), 'the call shows').toBeDefined()
    expect(await ui.find({ text: /offer from Sam/ }), 'its query shows').toBeDefined()
    expect(await ui.find({ text: /get transcript/ }), 'only one list open').toBeUndefined()

    await ui.press({ key: 'c:fireflies' })
    expect(await ui.find({ text: /get transcript/ }), 'Fireflies list open').toBeDefined()
    expect(await ui.find({ text: /search threads/ }), 'Gmail list closed').toBeUndefined()

    await ui.press({ key: 'c:fireflies' })
    expect(await ui.find({ text: /get transcript/ }), 'second press closes it').toBeUndefined()
  })

  test(`switched off in switches.json, the pane draws nothing of its own (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = { '~/.claude/mods/switches.json': JSON.stringify({ 'chat-inventory': false }) }
    const opened: string[] = []
    const runs: string[][] = []
    const clock = setup(on, files, opened, runs)
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({ tool: 'mcp__00000000-0000-0000-0000-00000000000a__search_threads', tool_use_id: 't1', query: 'offer' })
    await clock.settle()

    expect(opened, 'no pane pops open while off').not.toContain('chat-inventory')
    const ran = (await $.command.run({ command: 'inventory', args: '' } as never)) as { text?: string }
    expect(ran.text ?? '', 'the command says it is off').toContain('Chat Inventory is off')

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    expect(await ui.find({ text: /Connectors|Gmail|Skills/ }), 'nothing of its own').toBeUndefined()
    expect(await ui.find({ text: /Turned off/ }), 'one off line').toBeDefined()

    // Turned back on, an open request from /mods opens the pane and is removed.
    files['~/.claude/mods/switches.json'] = '{}'
    files['~/.claude/mods/.open-chat-inventory-sid'] = ''
    await clock.advance(3500)
    expect(opened, 'the open request opened the pane').toContain('chat-inventory')
    expect(runs.some(r => r[0] === 'rm'), 'the request file was removed').toBe(true)
  })
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`connectors are named from the server name or the tool names, never a raw id (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const clock = setup(on, {}, [], [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    // Made-up ids: on a real account each claude.ai connector has its own random id.
    const kit = 'mcp__00000000-0000-0000-0000-0000000000c1__'
    await call({ tool: `${kit}list_landing_pages`, tool_use_id: 'k1' })
    // list_posts alone could be Kit or Circle; this server already showed it is Kit.
    await call({ tool: `${kit}list_posts`, tool_use_id: 'k2' })
    await call({ tool: 'mcp__00000000-0000-0000-0000-0000000000c2__list_spaces', tool_use_id: 'c1' })
    await call({ tool: 'mcp__00000000-0000-0000-0000-0000000000c3__call-actor', tool_use_id: 'a1', actor: 'demo/scraper' })
    await call({ tool: 'mcp__00000000-0000-0000-0000-0000000000c4__notion-search', tool_use_id: 'n1', query: 'roadmap' })
    await call({ tool: 'mcp__plugin_demo_fireflies__fireflies_search', tool_use_id: 'f1', query: 'kickoff' })
    await call({ tool: 'mcp__claude_ai_Slack__slack_search_public', tool_use_id: 's1', query: 'launch' })
    await call({ tool: 'mcp__00000000-0000-0000-0000-0000000000c5__do_something_new', tool_use_id: 'x1' })
    await clock.settle()

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    for (const key of ['kit', 'circle', 'apify', 'notion', 'fireflies', 'slack', 'connector']) {
      expect(await ui.find({ key: `c:${key}` }), `${key} row`).toBeDefined()
    }
    expect(await ui.find({ text: /00000000|c5\b/ }), 'no raw server id').toBeUndefined()
    await ui.press({ key: 'c:kit' })
    expect(await ui.find({ text: /list landing pages/ }), 'Kit call').toBeDefined()
    expect(await ui.find({ text: /list posts/ }), 'the ambiguous call joined Kit').toBeDefined()
  })
}

const SW = '~/.claude/mods/switches.json'

for (const surface of ['desktop', 'terminal'] as const) {
  test(`Hide writes the shared flag, closes the pane and stops auto-open (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = {}
    const opened: string[] = []
    const clock = setup(on, files, opened, [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    expect(await ui.find({ key: 'hide' }), 'a Hide button').toBeDefined()
    await ui.press({ key: 'hide' })
    expect(JSON.parse(files[SW] ?? '{}'), 'flag written').toEqual({ 'chat-inventory:hidden': true })
    expect(opened, 'the pane closed').toContain('closed:chat-inventory')

    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({ tool: 'mcp__00000000-0000-0000-0000-00000000000a__search_threads', tool_use_id: 't1', query: 'offer' })
    await clock.settle()
    expect(opened, 'no auto-open while hidden').not.toContain('chat-inventory')
  })

  test(`clearing the flag lets Show open the pane again (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const files: Record<string, string> = { [SW]: JSON.stringify({ 'chat-inventory:hidden': true }) }
    const opened: string[] = []
    const clock = setup(on, files, opened, [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({ tool: 'mcp__00000000-0000-0000-0000-00000000000a__search_threads', tool_use_id: 't1', query: 'offer' })
    await clock.settle()
    expect(opened, 'hidden at start').not.toContain('chat-inventory')

    // Show in /mods clears the flag and writes the open request.
    files[SW] = '{}'
    files['~/.claude/mods/.open-chat-inventory-sid'] = ''
    await clock.advance(3500)
    expect(opened, 'the pane opened').toContain('chat-inventory')

    // /inventory also clears the flag.
    files[SW] = JSON.stringify({ 'chat-inventory:hidden': true })
    await clock.advance(3500)
    await $.command.run({ command: 'inventory', args: '' } as never)
    expect(JSON.parse(files[SW] ?? '{}'), '/inventory clears the flag').toEqual({})
  })
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`a section header arrow closes and opens it (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const clock = setup(on, {}, [], [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({ tool: 'Read', tool_use_id: 'r1', file_path: '/Users/test/x/offer.md' })
    await call({ tool: 'Skill', tool_use_id: 's1', skill: 'video-prep' })
    await clock.settle()

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    for (const id of ['connectors', 'files', 'skills']) {
      expect((await ui.find({ key: `sec-${id}` }))?.text ?? '', `${id} open by default`).toMatch(/^▾ /)
    }
    expect(await ui.find({ text: /offer\.md/ }), 'file listed').toBeDefined()

    await ui.press({ key: 'sec-files' })
    expect((await ui.find({ key: 'sec-files' }))?.text ?? '', 'arrow turns').toMatch(/^▸ Context files/)
    expect(await ui.find({ text: /offer\.md/ }), 'files hidden').toBeUndefined()
    expect(await ui.find({ text: /video-prep/ }), 'other sections stay open').toBeDefined()

    await ui.press({ key: 'sec-files' })
    expect(await ui.find({ text: /offer\.md/ }), 'open again').toBeDefined()
  })

  test(`context files show 10 rows at a time with Up and Down (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const clock = setup(on, {}, [], [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    for (let i = 1; i <= 14; i += 1) await call({ tool: 'Read', tool_use_id: `r${i}`, file_path: `/Users/test/x/note${i}.md` })
    await clock.settle()

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    const shown = async () => (await ui.findAll({ type: 'Text', text: /^note\d+\.md/ })).length
    // 14 read files plus CLAUDE.md: 15 in all, 10 shown.
    expect(await shown(), 'ten note rows at most').toBeLessThanOrEqual(10)
    expect(await ui.find({ text: /^1 to 10 of 15$/ }), 'where the window is').toBeDefined()
    expect(await ui.find({ key: 'files-up' }), 'no Up at the top').toBeUndefined()
    expect(await ui.find({ text: /note14\.md/ }), 'newest first').toBeDefined()

    await ui.press({ key: 'files-down' })
    expect(await ui.find({ text: /^6 to 15 of 15$/ }), 'moved down').toBeDefined()
    expect(await ui.find({ text: /note14\.md/ }), 'newest scrolled out').toBeUndefined()
    expect(await ui.find({ text: /CLAUDE\.md/ }), 'oldest in view').toBeDefined()
    expect(await ui.find({ key: 'files-down' }), 'no Down at the end').toBeUndefined()

    await ui.press({ key: 'files-up' })
    expect(await ui.find({ text: /^1 to 10 of 15$/ }), 'back up').toBeDefined()
  })
}

const PLAN_FILE = '~/.claude/mods-state/plan-sid.json'

for (const surface of ['desktop', 'terminal'] as const) {
  test(`a TodoWrite call draws three to-do rows with the right marks (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const opened: string[] = []
    const clock = setup(on, {}, opened, [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({
      tool: 'TodoWrite',
      tool_use_id: 'w1',
      todos: [
        { content: 'Read the brief', status: 'completed', activeForm: 'Reading the brief' },
        { content: 'Write the code', status: 'in_progress', activeForm: 'Writing the code' },
        { content: 'Run the checks', status: 'pending', activeForm: 'Running the checks' },
      ],
    })
    await clock.settle()
    expect(opened, 'a plan opens the pane').toContain('chat-inventory')

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    expect(await ui.find({ text: /^To-do$/ }), 'heading').toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^1 of 3$/ }), 'count on the right').toBeDefined()
    expect((await ui.findAll({ type: 'Text', text: /^✓$/ })).length, 'one done mark').toBe(1)
    expect((await ui.findAll({ type: 'Text', text: /^●$/ })).length, 'one in-progress mark').toBe(1)
    expect((await ui.findAll({ type: 'Text', text: /^○$/ })).length, 'one empty circle').toBe(1)
    const done = await ui.find({ type: 'Text', text: /^Read the brief$/ })
    expect(done?.props.strikethrough, 'done text struck through').toBe(true)
    expect(done?.props.dimColor, 'done text dim').toBe(true)
    const now = await ui.find({ type: 'Text', text: /^Writing the code$/ })
    expect(now?.props.bold, 'in-progress uses activeForm, bold').toBe(true)
    expect(await ui.find({ text: /^Run the checks$/ }), 'pending step').toBeDefined()
    expect(await ui.find({ text: /No to-do list yet/ }), 'no empty line').toBeUndefined()
  })

  test(`a plan file on disk is drawn and long steps wrap (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const long = 'Pull every Stripe charge for the last thirty days and match each one to a Circle member by email'
    const files: Record<string, string> = {
      [PLAN_FILE]: JSON.stringify({
        title: 'Churn check',
        steps: [
          { text: 'Find the members', status: 'completed', doneAt: '2026-10-16T09:00:00.000Z' },
          { text: 'Score them', status: 'completed', doneAt: '2026-10-16T09:05:00.000Z' },
          { text: long, status: 'in_progress' },
          { text: 'Build the sheet', status: 'pending' },
        ],
        updatedAt: '2026-10-16T09:06:00.000Z',
      }),
    }
    const clock = setup(on, files, [], [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    await clock.advance(3500)

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    expect(await ui.find({ type: 'Text', text: /^2 of 4$/ }), 'count').toBeDefined()
    expect(await ui.find({ text: /Churn check/ }), 'title').toBeDefined()
    expect(await ui.find({ text: /^Build the sheet$/ }), 'pending step').toBeDefined()
    expect((await ui.findAll({ type: 'Text', text: /^✓$/ })).length, 'two done marks').toBe(2)
    const lines = await ui.findAll({ type: 'Text', text: /Stripe|Circle|email/ })
    expect(lines.length, 'the long step wraps onto more than one line').toBeGreaterThan(1)
    for (const l of lines) expect(String(l.text ?? '').length, 'each line fits the pane').toBeLessThanOrEqual(42)
  })

  test(`no plan shows one dim line; context files count the files read (${surface})`, { timeoutMs: 30000 }, async ($, on) => {
    const clock = setup(on, {}, [], [])
    await $.session.start({ source: 'startup', cwd: '/Users/test/vault', surface, isInteractive: true } as never)
    await clock.settle()
    const call = $.tool.call as unknown as (input: Record<string, unknown>) => Promise<unknown>
    await call({ tool: 'Read', tool_use_id: 'r1', file_path: '/Users/test/x/offer.md' })
    await clock.settle()

    const ui = await $.ui.mount({ plugin: 'chat-inventory', surface, component: 'Pane', requestId: 'chat-inventory', props: paneProps })
    const empty = await ui.find({ type: 'Text', text: /^No to-do list yet\./ })
    expect(empty, 'the empty line').toBeDefined()
    expect(empty?.props.dimColor, 'dim').toBe(true)
    expect(await ui.find({ text: /of \d+$/ }), 'no count without a plan').toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /^Files read$/ }), 'Files read line').toBeDefined()
  })
}
