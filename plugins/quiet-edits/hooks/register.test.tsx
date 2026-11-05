import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

type Skins = { skin?: string; disclosure?: string }

// An edit's result row, as the engine raises it.
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

  // Claude Code's own diff.
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

test('a failed edit, the full transcript and other tools keep their result', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  for (const overrides of [{ isErrored: true }, { isExpanded: true }, { tool: 'Bash' }, { tool: 'Read' }]) {
    const ui = await $.ui.mount({ ...row(overrides), surface: 'terminal' })

    expect(await isShown(ui)).toBe(true)
    await ui.unmount()
  }
})

test('the desktop keeps its diff card', async ($, on) => {
  stage(on, { skin: 'nightgrid' })

  const ui = await $.ui.mount({ ...row(), surface: 'desktop' })

  expect(await isShown(ui)).toBe(true)
  await ui.unmount()
})
