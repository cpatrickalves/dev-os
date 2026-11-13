import { describe, expect, mock, test } from 'claude-code/testing'

import { build, countdown, fill, fit, modelName, percent, resetBandOrder, tint, tone } from '../hooks/register'

const NOW = Date.parse('2026-10-03T12:00:00Z')
const at = (ms: number) => new Date(NOW + ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN

// Tokyo Night, the theme of herdr/nightgrid and the nightgrid skin: each pill's text color, and its
// background, the same color at 25% over the theme's background (#1a1b26).
const TEXT = '#c0caf5'
const CYAN = '#7dcfff'
const BLUE = '#7aa2f7'
const AMBER = '#e0af68'
const RED = '#f7768e'
const TEXT_BG = '#44475a'
const CYAN_BG = '#33485c'
const BLUE_BG = '#323d5a'
const AMBER_BG = '#4c4037'
const RED_BG = '#513240'
const CAP_LEFT = ''
const CAP_RIGHT = ''

type Limit = { kind: string; percentUsed: number; resetsAt?: string }
type First = { rateLimits: Limit[]; context?: { tokens?: number; window: number; percent?: number } }

// Stands for the engine beneath the mod. `model` is what /model shows; it can change mid-session.
function engine(on: any, first: First, beneath?: unknown) {
  const toasts: string[] = []
  const session = { model: 'claude-opus-5-5' }
  const clock = mock.clock(on, { now: NOW })
  on('session.start', (_$: any, e: any) => ({ sessionId: 's', cwd: e.cwd }))
  on('session.model', () => ({ value: session.model }))
  on('session.usage', () => ({ value: { startedAt: NOW, context: { window: 200_000 }, ...first } }))
  on('session.measure', (_$: any, e: any) => ({ changed: e.changed }))
  on('ui.toast', (_$: any, e: any) => (toasts.push(e.text), { value: undefined }))
  on('ui.render', ($: any, e: any) => beneath ?? $.ui.resolve(e).Text({ children: 'engine band' }))
  on('turn.step', async function* (_$: any, e: any) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return { toasts, clock, session }
}

// One model request of the main loop (or of a subagent, with `agentId`), read to its end.
async function step($: any, effort: unknown, agentId?: string) {
  const input = { turnId: 't', index: 0, model: 'claude-opus-5-5', messageCount: 1, ...(effort === undefined ? {} : { effort }), ...(agentId ? { agentId } : {}) }
  for await (const _ of $.turn.step(input)) {
    // the chunks are the engine's; the effort is read from the request
  }
}

// The band over the prompt, where the mod draws with `position: above`; ROUND adds the powerline ends.
const ABOVE = { options: { position: 'above' } }
const ROUND = { options: { position: 'above', caps: 'round' } }
const band = (bodyColumns = 120) => ({
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns },
})

// The footer's hint line under the prompt, where the mod draws by default.
const foot = (columns?: number) => ({
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
  ...(columns === undefined ? {} : { viewport: { columns, rows: 40, isFullscreen: true } }),
})

const start = ($: any) => $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
const measure = ($: any, rateLimits: Limit[], context: First['context'] = { window: 200_000 }) =>
  $.session.measure({ context, rateLimits, changed: ['rateLimits'] })

// Every Text of the mod's band, in order.
async function cells(ui: any) {
  const texts: any[] = (await ui.findAll({ type: 'Text' })) ?? []
  return texts.filter(t => t.text !== 'engine band')
}

// The band as drawn: the pills and their caps, joined.
async function line(ui: any) {
  return (await cells(ui)).map(t => t.text).join('')
}

// The pill holding `text`.
async function pill(ui: any, text: RegExp) {
  return (await cells(ui)).find(t => text.test(t.text))
}

describe('usage-meter in the band (position: above)', () => {
  test('helpers: percents, tones, context fill, model names and countdowns', () => {
    expect(percent(7)).toBe('7.0%')
    expect(percent(23.46)).toBe('23.5%')
    expect(tone(74.9)).toEqual({ bg: BLUE_BG, fg: BLUE })
    expect(tone(75)).toEqual({ bg: AMBER_BG, fg: AMBER })
    expect(tone(89.9)).toEqual({ bg: AMBER_BG, fg: AMBER })
    expect(tone(90)).toEqual({ bg: RED_BG, fg: RED })
    expect(tint(BLUE, 0.25)).toBe(BLUE_BG)
    expect(tint(BLUE, 1)).toBe(BLUE) // opaque
    expect(tint(BLUE, 0)).toBe('#1a1b26') // the theme's background
    expect(percent(fill({ tokens: 37_792, window: 1_000_000, percent: 4 })!)).toBe('3.8%') // from the tokens, not the whole 4
    expect(fill({ window: 200_000, percent: 12 })).toBe(12)
    expect(fill({ window: 200_000 })).toBeUndefined()
    expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
    expect(modelName('claude-fable-5-1[1m]')).toBe('Fable 5.1')
    expect(modelName('us.anthropic.claude-3-5-haiku-20241022-v1:0')).toBe('Haiku 3.5')
    expect(modelName('sonnet')).toBe('Sonnet')
    expect(modelName('my-gateway/custom-model')).toBe('custom-model')
    expect(countdown(2 * HOUR + 10 * MIN)).toBe('2h10')
    expect(countdown(45 * MIN)).toBe('45m')
    expect(countdown(3 * 24 * HOUR + 4 * HOUR)).toBe('3d4h')
    expect(countdown(-5)).toBe('now')
  })

  test('draws the model, the context, the session and its countdown as pills', ABOVE, async ($, on) => {
    engine(on, {
      context: { tokens: 14_000, window: 200_000, percent: 7 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }],
    })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    // Flat by default, side by side.
    expect(await line(ui)).toBe(' Model: Opus 5.5  Ctx Used: 7.0%  Session: 50.0%  Reset: 19m ')
    // Each pill's text is its color, over that color faded into the theme's background.
    expect((await pill(ui, /Model/))?.props).toMatchObject({ backgroundColor: CYAN_BG, color: CYAN })
    expect((await pill(ui, /Ctx Used/))?.props).toMatchObject({ backgroundColor: TEXT_BG, color: TEXT })
    expect((await pill(ui, /Session/))?.props).toMatchObject({ backgroundColor: BLUE_BG, color: BLUE })
    expect((await pill(ui, /19m/))?.props).toMatchObject({ backgroundColor: TEXT_BG, color: TEXT })
    expect(await cells(ui)).toHaveLength(4) // the pills alone, nothing between them
    expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined() // stacked, not replaced
    await ui.unmount()
  })

  test('caps set to round draws powerline ends', ROUND, async ($, on) => {
    engine(on, {
      context: { tokens: 14_000, window: 200_000, percent: 7 },
      rateLimits: [
        { kind: 'seven_day', percentUsed: 18, resetsAt: at(80 * HOUR) },
        { kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) },
      ],
    })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toBe(
      `${CAP_LEFT} Model: Opus 5.5 ${CAP_RIGHT} Ctx Used: 7.0% ${CAP_RIGHT} Session: 50.0% ${CAP_RIGHT} Reset: 19m ${CAP_RIGHT}`,
    )
    expect((await pill(ui, /Session/))?.props).toMatchObject({ backgroundColor: BLUE_BG, color: BLUE })

    // Each cap is its own pill's color, over the next pill's; the first and the last sit on the terminal's.
    const caps = (await cells(ui)).filter(t => t.text === CAP_LEFT || t.text === CAP_RIGHT)
    expect(caps.map(c => [c.props?.color, c.props?.backgroundColor])).toEqual([
      [CYAN_BG, undefined],
      [CYAN_BG, TEXT_BG],
      [TEXT_BG, BLUE_BG],
      [BLUE_BG, TEXT_BG],
      [TEXT_BG, undefined],
    ])
    await ui.unmount()
  })

  test('two empty rows above the pills, fewer in a band short of rows', ABOVE, async ($, on) => {
    engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }] })
    await start($)
    // Claude Code stacks each mod's part: the mod's column holds its keyed Box, and that the row of pills.
    const row = async (ui: any) => {
      const root: any = await ui.drawn()
      const part = root.part?.plugin === 'usage-meter' ? root : root.children.find((c: any) => c.part?.plugin === 'usage-meter')
      return part.children.find((c: any) => c.props?.key === 'band:usage-meter').children[0]
    }

    for (const [maxRows, gap] of [[10, 2], [3, 2], [2, 1], [1, 0]] as const) {
      const ui = await $.ui.mount({
        plugin: 'usage-meter',
        surface: 'terminal',
        component: 'AbovePrompt',
        props: { hasSurvey: false, isWorking: false, maxRows, bodyColumns: 120 },
      } as any)
      expect((await row(ui)).props.marginTop).toBe(gap)
      expect(await line(ui)).toContain(' Session: 50.0% ') // the pills themselves always show
      await ui.unmount()
    }
  })

  test('flat pills off the terminal, even with caps set to round', ROUND, async ($, on) => {
    engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }] })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'desktop', ...band() } as any)
    expect(await line(ui)).toBe(' Model: Opus 5.5  Session: 50.0%  Reset: 19m ')
    await ui.unmount()

    // Flat pills are narrower: the same two fit where the three caps would not.
    const pills = build({ model: 'opus', rateLimits: [{ kind: 'five_hour', percentUsed: 50 }] }, NOW)
    expect(fit(pills, 30, false).map(p => p.kind)).toEqual(['model', 'window']) // 13 + 16 cells
    expect(fit(pills, 30, true).map(p => p.kind)).toEqual(['window']) // 32 with the three caps
  })

  test('caps set to none draws flat pills, as by default', { options: { caps: 'none', position: 'above' } }, async ($, on) => {
    engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }] })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toBe(' Model: Opus 5.5  Session: 50.0%  Reset: 19m ')
    await ui.unmount()
  })

  test('the session pill follows the thresholds and the countdown ticks', ABOVE, async ($, on) => {
    const { clock } = engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 74.9, resetsAt: at(46 * MIN) }] })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect((await pill(ui, /Session: 74\.9%/))?.props?.backgroundColor).toBe(BLUE_BG)
    expect(await line(ui)).toContain(' Reset: 46m ')

    await clock.advance(MIN)
    expect(await line(ui)).toContain(' Reset: 45m ')

    await measure($, [{ kind: 'five_hour', percentUsed: 75, resetsAt: at(46 * MIN) }])
    expect((await pill(ui, /Session: 75\.0%/))?.props).toMatchObject({ backgroundColor: AMBER_BG, color: AMBER })
    await measure($, [{ kind: 'five_hour', percentUsed: 89.9, resetsAt: at(46 * MIN) }])
    expect((await pill(ui, /Session: 89\.9%/))?.props?.backgroundColor).toBe(AMBER_BG)
    await measure($, [{ kind: 'five_hour', percentUsed: 90, resetsAt: at(46 * MIN) }])
    expect((await pill(ui, /Session: 90\.0%/))?.props).toMatchObject({ backgroundColor: RED_BG, color: RED })
    await ui.unmount()
  })

  test('a /model switch and a new context reading show up', ABOVE, async ($, on) => {
    const { clock, session } = engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 10, resetsAt: at(HOUR) }] })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toContain(' Model: Opus 5.5 ')
    expect(await line(ui)).not.toContain('Ctx Used') // no reading yet

    session.model = 'claude-sonnet-5-5'
    await clock.advance(MIN) // the timer picks the switch up
    expect(await line(ui)).toContain(' Model: Sonnet 5.5 ')

    session.model = 'haiku'
    await measure($, [{ kind: 'five_hour', percentUsed: 11, resetsAt: at(HOUR) }], { tokens: 37_792, window: 1_000_000, percent: 4 })
    expect(await line(ui)).toContain(' Model: Haiku ')
    expect(await line(ui)).toContain(' Ctx Used: 3.8% ')
    await ui.unmount()
  })

  test("the model pill shows the effort of the main loop's last request", ABOVE, async ($, on) => {
    engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 10, resetsAt: at(HOUR) }] })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toContain(' Model: Opus 5.5 ') // no request yet, no effort

    await step($, 'medium')
    expect(await line(ui)).toContain(' Model: Opus 5.5 (medium) ')
    await step($, 'low', 'agent-1') // a subagent's request leaves the main loop's alone
    expect(await line(ui)).toContain(' Model: Opus 5.5 (medium) ')
    await step($, 'xhigh') // a /effort change
    expect(await line(ui)).toContain(' Model: Opus 5.5 (xhigh) ')

    // A new usage reading keeps it.
    await measure($, [{ kind: 'five_hour', percentUsed: 11, resetsAt: at(HOUR) }])
    expect(await line(ui)).toContain(' Model: Opus 5.5 (xhigh) ')

    // A token budget, or a model without effort, shows none.
    await step($, 32_000)
    expect(await line(ui)).toContain(' Model: Opus 5.5  Session')
    await step($, 'high')
    await step($, undefined)
    expect(await line(ui)).toContain(' Model: Opus 5.5  Session')
    await ui.unmount()
  })

  test('the other windows show only once they run high', ABOVE, async ($, on) => {
    engine(on, {
      rateLimits: [
        { kind: 'five_hour', percentUsed: 42, resetsAt: at(2 * HOUR + 10 * MIN) },
        { kind: 'seven_day', percentUsed: 74, resetsAt: at(76 * HOUR) },
      ],
    })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).not.toContain('Week')

    await measure($, [
      { kind: 'five_hour', percentUsed: 42, resetsAt: at(2 * HOUR + 10 * MIN) },
      { kind: 'seven_day', percentUsed: 78, resetsAt: at(76 * HOUR) },
    ])
    expect(await line(ui)).toContain(' Session: 42.0%  Reset: 2h10  Week: 78.0% · 3d4h ')
    expect((await pill(ui, /Week/))?.props?.backgroundColor).toBe(AMBER_BG)
    await ui.unmount()
  })

  test('one toast per window per reset period past 90%', async ($, on) => {
    const { toasts } = engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(HOUR) }] })
    await start($)
    expect(toasts).toHaveLength(0)

    await measure($, [{ kind: 'five_hour', percentUsed: 91, resetsAt: at(HOUR) }])
    expect(toasts).toEqual(['5h usage limit at 91%, resets in 1h00'])
    await measure($, [{ kind: 'five_hour', percentUsed: 95, resetsAt: at(HOUR) }])
    await measure($, [{ kind: 'five_hour', percentUsed: 97, resetsAt: at(HOUR + 2 * MIN) }]) // same period, a little jitter
    expect(toasts).toHaveLength(1)

    await measure($, [{ kind: 'five_hour', percentUsed: 92, resetsAt: at(6 * HOUR) }]) // the next period
    await measure($, [{ kind: 'seven_day', percentUsed: 90, resetsAt: at(50 * HOUR) }])
    expect(toasts).toHaveLength(3)
    expect(toasts[2]).toBe('7d usage limit at 90%, resets in 2d2h')
  })

  test('a window with no reset time warns again only after it drops under 90%', async ($, on) => {
    const { toasts } = engine(on, { rateLimits: [] })
    await start($)
    await measure($, [{ kind: 'spend_limit', percentUsed: 120 }])
    await measure($, [{ kind: 'spend_limit', percentUsed: 125 }])
    expect(toasts).toEqual(['Spend limit at 120%'])
    await measure($, [{ kind: 'spend_limit', percentUsed: 10 }])
    await measure($, [{ kind: 'spend_limit', percentUsed: 95 }])
    expect(toasts).toEqual(['Spend limit at 120%', 'Spend limit at 95%'])
  })

  test('a window past its reset time hides until a fresh reading; spend over 100% stays red', ABOVE, async ($, on) => {
    const { clock } = engine(on, {
      rateLimits: [
        { kind: 'five_hour', percentUsed: 96, resetsAt: at(10 * MIN) },
        { kind: 'spend_limit', percentUsed: 120 },
      ],
    })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toContain(' Session: 96.0%  Reset: 10m  Spend: 120.0% ')
    expect((await pill(ui, /Session/))?.props?.backgroundColor).toBe(RED_BG)
    expect((await pill(ui, /Spend/))?.props?.backgroundColor).toBe(RED_BG)

    await clock.advance(11 * MIN)
    // The spend limit is the first window now, and it has no reset time to count down to.
    expect(await line(ui)).toBe(' Model: Opus 5.5  Spend: 120.0% ')
    await ui.unmount()
  })

  test('yields the band to a survey', ABOVE, async ($, on) => {
    engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 42 }] })
    await start($)
    const ui = await $.ui.mount({
      plugin: 'usage-meter',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: true, isWorking: false, maxRows: 10, bodyColumns: 120 },
    } as any)
    expect(await line(ui)).toBe('')
    expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()
    await ui.unmount()
  })

  test('no subscription: the model and the context alone', ABOVE, async ($, on) => {
    engine(on, { rateLimits: [], context: { tokens: 50_000, window: 200_000, percent: 25 } })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toBe(' Model: Opus 5.5  Ctx Used: 25.0% ')
    await ui.unmount()
  })

  test('nothing to show: the line hides', ABOVE, async ($, on) => {
    const { session } = engine(on, { rateLimits: [] })
    session.model = ''
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toBe('')
    expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()
    await ui.unmount()
  })

  test('narrow terminals drop the model first, then the context, then the countdown', ABOVE, async ($, on) => {
    engine(on, {
      context: { tokens: 14_000, window: 200_000, percent: 7 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }],
    })
    await start($)
    // The whole row is 61 cells, padding aside: 17 + 16 + 16 + 12 for the pills.
    const wide = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(63) } as any)
    expect(await line(wide)).toContain('Model')
    await wide.unmount()

    const mid = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(62) } as any)
    expect(await line(mid)).toBe(' Ctx Used: 7.0%  Session: 50.0%  Reset: 19m ')
    await mid.unmount()

    const thin = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(30) } as any)
    expect(await line(thin)).toBe(' Session: 50.0%  Reset: 19m ')
    await thin.unmount()

    const tiny = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(29) } as any)
    expect(await line(tiny)).toBe(' Session: 50.0% ')
    await tiny.unmount()
  })

  test('with round caps, the caps count in the width', ROUND, async ($, on) => {
    engine(on, { context: { tokens: 14_000, window: 200_000, percent: 7 }, rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }] })
    await start($)
    // 66 cells, padding aside: 18 + 17 + 17 + 13 for the pills and their caps, 1 for the first cap.
    const wide = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(68) } as any)
    expect(await line(wide)).toContain('Model')
    await wide.unmount()

    const mid = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(67) } as any)
    expect(await line(mid)).toBe(`${CAP_LEFT} Ctx Used: 7.0% ${CAP_RIGHT} Session: 50.0% ${CAP_RIGHT} Reset: 19m ${CAP_RIGHT}`)
    await mid.unmount()
  })

  // Since Claude Code 2.1.323 next(e) answers an opaque { type: 'engine', ref } and the
  // engine stacks the bands of the mods beneath on its own: the order file moves nothing.
  test('keys its band; the band order file no longer moves bands across mods', ABOVE, async ($, on) => {
    // another band mod drew its column beneath
    const beneath = {
      type: 'Box',
      props: { key: 'bands', flexDirection: 'column' },
      children: [{ type: 'Box', props: { key: 'band:where-am-i' }, children: [{ type: 'Text', children: ['here'] }] }],
    }
    resetBandOrder()
    const files: Record<string, string> = { '/home/me/.claude/claude-code-mods/bands.json': '{"order":["where-am-i","usage-meter"]}' }
    on('env.get', (_$: any, e: any) => ({ value: e.name === 'HOME' ? '/home/me' : undefined }))
    on('fs.exists', (_$: any, e: any) => ({ value: e.path in files }))
    on('fs.read', (_$: any, e: any) => ({ value: files[e.path] ?? '' }))
    engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 42, resetsAt: at(2 * HOUR) }] }, beneath)
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    const root: any = await ui.drawn()
    expect(root.children.map((c: any) => c.part?.plugin)).toEqual(['usage-meter', 'test'])
    expect(root.children[0].props.key).toBe('bands')
    expect(root.children[0].children.map((c: any) => c.props?.key)).toContain('band:usage-meter')
    expect(root.children[1].children.map((c: any) => c.props.key)).toEqual(['band:where-am-i'])
    expect(await line(ui)).toContain(' Session: 42.0% ')
    await ui.unmount()
    resetBandOrder()
  })
})

describe('usage-meter under the prompt (the default)', () => {
  const FULL = ' Model: Opus 5.5  Ctx Used: 7.0%  Session: 50.0%  Reset: 19m '
  const first = {
    context: { tokens: 14_000, window: 200_000, percent: 7 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }],
  }

  test('draws the pills in a row of their own under the hint line, and nothing in the band', async ($, on) => {
    engine(on, first)
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...foot(120) } as any)
    expect(await line(ui)).toBe(FULL)
    // One column: what was there (the engine's hint line) first, then the mod's row.
    const root: any = await ui.drawn()
    expect(root.props.flexDirection).toBe('column')
    expect(root.children).toHaveLength(2)
    expect(root.children[1].props.key).toBe('usage-meter')
    expect(root.children[1].props.marginTop).toBe(1) // an empty row between the hint line and the pills
    expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()
    await ui.unmount()

    const above = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(above)).toBe('')
    expect(await above.find({ type: 'Text', text: /engine band/ })).toBeDefined()
    await above.unmount()
  })

  test('position: above leaves the footer alone', ABOVE, async ($, on) => {
    engine(on, first)
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...foot(120) } as any)
    expect(await line(ui)).toBe('')
    expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()
    await ui.unmount()
  })

  test('fits the terminal width, less the footer indent on each side', async ($, on) => {
    engine(on, first)
    await start($)
    // The whole row is 61 cells; the footer leaves the terminal's columns less 4.
    const wide = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...foot(65) } as any)
    expect(await line(wide)).toBe(FULL)
    await wide.unmount()

    const mid = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...foot(64) } as any)
    expect(await line(mid)).toBe(' Ctx Used: 7.0%  Session: 50.0%  Reset: 19m ')
    await mid.unmount()

    const thin = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...foot(31) } as any)
    expect(await line(thin)).toBe(' Session: 50.0% ')
    await thin.unmount()

    // A surface that does not say its width: 80 columns are assumed, and the whole row fits.
    const unsized = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...foot() } as any)
    expect(await line(unsized)).toBe(FULL)
    await unsized.unmount()
  })

  test('the countdown ticks, a new reading shows up, and the desktop draws the same', async ($, on) => {
    const { clock } = engine(on, first)
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...foot(120) } as any)
    await clock.advance(MIN)
    expect(await line(ui)).toContain(' Reset: 18m ')
    await measure($, [{ kind: 'five_hour', percentUsed: 90, resetsAt: at(19 * MIN) }])
    expect((await pill(ui, /Session: 90\.0%/))?.props?.backgroundColor).toBe(RED_BG)
    await ui.unmount()

    const desktop = await $.ui.mount({ plugin: 'usage-meter', surface: 'desktop', ...foot(120) } as any)
    expect(await line(desktop)).toBe(' Model: Opus 5.5  Session: 90.0%  Reset: 18m ')
    await desktop.unmount()
  })
})
