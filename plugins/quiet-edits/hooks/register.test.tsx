import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

type Skins = { skin?: string; disclosure?: string }

// A result row, as the engine raises it; an edit's unless overridden.
const row = (overrides: Record<string, unknown> = {}) =>
  ({
    plugin: 'quiet-edits',
    component: 'ToolResult',
    requestId: 'call-1',
    props: {
      tool_use_id: 'call-1',
      tool: 'Edit',
      output: { filePath: '/repo/README.md', structuredPatch: [] },
      isErrored: false,
      ...overrides,
    },
  }) as const

// Stands for the engine and for the skins mod's state. `skin` undefined: skins
// is not there at all, so nothing was ever written under its keys.
const stage = (on: Parameters<TestBody>[1], skins: Skins) => {
  on('state.get', (_, e) => {
    const address = e as { plugin: string; key: string }

    if (address.plugin !== 'skins' || skins.skin === undefined) {
      return { value: { value: undefined, version: 0 } }
    }

    if (address.key === 'prefs') {
      return { value: { value: { skin: skins.skin }, version: 1 } }
    }

    return { value: { value: skins.disclosure ?? 'auto', version: 1 } }
  })

  // What is drawn beneath this mod: Claude Code's diff, or skins' output card.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine diff</Text>
  })
}

const isShown = async (ui: { find: (query: { type: 'Text'; text: RegExp }) => Promise<unknown> }) =>
  (await ui.find({ type: 'Text', text: /engine diff/ })) !== undefined

test('a closed edit row hides its diff in the terminal', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  for (const tool of ['Edit', 'MultiEdit', 'Write']) {
    const ui = await $.ui.mount({ ...row({ tool }), surface: 'terminal' })

    expect(await isShown(ui)).toBe(false)
    await ui.unmount()
  }
})

test('a row closed by hand hides its diff too', async ($, on) => {
  stage(on, { skin: 'nightgrid', disclosure: 'closed' })

  const ui = await $.ui.mount({ ...row(), surface: 'terminal' })

  expect(await isShown(ui)).toBe(false)
  await ui.unmount()
})

test('an opened row is left to skins and the engine', async ($, on) => {
  stage(on, { skin: 'nightgrid', disclosure: 'open' })

  const ui = await $.ui.mount({ ...row(), surface: 'terminal' })

  expect(await isShown(ui)).toBe(true)
  await ui.unmount()
})

// With no chevron to open the row again, the diff stays.
test('with skins switched off the diff stays', async ($, on) => {
  stage(on, { skin: 'off' })

  const ui = await $.ui.mount({ ...row(), surface: 'terminal' })

  expect(await isShown(ui)).toBe(true)
  await ui.unmount()
})

test('without skins the diff stays', async ($, on) => {
  stage(on, {})

  const ui = await $.ui.mount({ ...row(), surface: 'terminal' })

  expect(await isShown(ui)).toBe(true)
  await ui.unmount()
})

// A shell command's result row: both streams, ended on its own.
const shell = (output: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}) =>
  row({ tool: 'Bash', output: { stdout: 'ok\n', stderr: '', interrupted: false, ...output }, ...overrides })

test('a closed shell row hides its output in the terminal', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  for (const tool of ['Bash', 'PowerShell']) {
    const ui = await $.ui.mount({ ...shell({}, { tool }), surface: 'terminal' })

    expect(await isShown(ui)).toBe(false)
    await ui.unmount()
  }
})

test('a command with no output folds as well', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  const ui = await $.ui.mount({ ...shell({ stdout: '' }), surface: 'terminal' })

  expect(await isShown(ui)).toBe(false)
  await ui.unmount()
})

test('an opened shell row is left to skins and the engine', async ($, on) => {
  stage(on, { skin: 'nightgrid', disclosure: 'open' })

  const ui = await $.ui.mount({ ...shell(), surface: 'terminal' })

  expect(await isShown(ui)).toBe(true)
  await ui.unmount()
})

// What happened to these is not output the row can show again.
test('a command that did not end in the foreground keeps its result', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  for (const output of [{ interrupted: true }, { timedOutAfterMs: 120000 }, { backgroundTaskId: 'task-1' }, { isImage: true }]) {
    const ui = await $.ui.mount({ ...shell(output), surface: 'terminal' })

    expect(await isShown(ui)).toBe(true)
    await ui.unmount()
  }
})

test('a shell result that is not its two streams keeps its drawing', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  for (const output of ['plain text', null, { stdout: 'ok' }]) {
    const ui = await $.ui.mount({ ...row({ tool: 'Bash', output }), surface: 'terminal' })

    expect(await isShown(ui)).toBe(true)
    await ui.unmount()
  }
})

test('a failed call, the full transcript and other tools keep their result', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  const kept = [
    row({ isErrored: true }),
    row({ isExpanded: true }),
    shell({}, { isErrored: true }),
    shell({}, { isExpanded: true }),
    row({ tool: 'Read' }),
    row({ tool: 'Grep' }),
  ]

  for (const result of kept) {
    const ui = await $.ui.mount({ ...result, surface: 'terminal' })

    expect(await isShown(ui)).toBe(true)
    await ui.unmount()
  }
})

test('without skins a command keeps its output', async ($, on) => {
  stage(on, {})

  const ui = await $.ui.mount({ ...shell(), surface: 'terminal' })

  expect(await isShown(ui)).toBe(true)
  await ui.unmount()
})

test('the desktop keeps its diff and terminal cards', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  for (const result of [row(), shell()]) {
    const ui = await $.ui.mount({ ...result, surface: 'desktop' })

    expect(await isShown(ui)).toBe(true)
    await ui.unmount()
  }
})
