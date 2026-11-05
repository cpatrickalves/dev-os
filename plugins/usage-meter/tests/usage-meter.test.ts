import { describe, expect, mock, test } from 'claude-code/testing'

import { build, countdown, fill, fit, modelName, percent, resetBandOrder, tone } from '../hooks/register'

const NOW = Date.parse('2026-10-03T12:00:00Z')
const at = (ms: number) => new Date(NOW + ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN

// Tokyo Night, the theme of herdr/nightgrid and the nightgrid skin.
const INK = '#1a1b26'
const TEXT = '#c0caf5'
const CYAN = '#7dcfff'
const SLATE = '#414868'
const BLUE = '#7aa2f7'
const PURPLE = '#bb9af7'
const AMBER = '#e0af68'
const RED = '#f7768e'
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
  return { toasts, clock, session }
}

const band = (bodyColumns = 120) => ({
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns },
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

describe('usage-meter', () => {
  test('helpers: percents, tones, context fill, model names and countdowns', () => {
    expect(percent(7)).toBe('7.0%')
    expect(percent(23.46)).toBe('23.5%')
    expect(tone(74.9).bg).toBe(BLUE)
    expect(tone(75).bg).toBe(AMBER)
    expect(tone(89.9).bg).toBe(AMBER)
    expect(tone(90).bg).toBe(RED)
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

  test('draws the model, the context, the session and its countdown as pills', async ($, on) => {
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
    expect((await pill(ui, /Model/))?.props?.backgroundColor).toBe(CYAN)
    expect((await pill(ui, /Model/))?.props?.color).toBe(INK) // the bright pills take the theme's background as text
    expect((await pill(ui, /Ctx Used/))?.props?.backgroundColor).toBe(SLATE)
    expect((await pill(ui, /Ctx Used/))?.props?.color).toBe(TEXT)
    expect((await pill(ui, /Session/))?.props?.backgroundColor).toBe(BLUE)
    expect((await pill(ui, /19m/))?.props?.backgroundColor).toBe(PURPLE)

    // Each cap is its own pill's color, over the next pill's; the first and the last sit on the terminal's.
    const caps = (await cells(ui)).filter(t => t.text === CAP_LEFT || t.text === CAP_RIGHT)
    expect(caps.map(c => [c.props?.color, c.props?.backgroundColor])).toEqual([
      [CYAN, undefined],
      [CYAN, SLATE],
      [SLATE, BLUE],
      [BLUE, PURPLE],
      [PURPLE, undefined],
    ])
    expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined() // stacked, not replaced
    await ui.unmount()
  })

  test('one empty row above the pills, when the band has the rows', async ($, on) => {
    engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }] })
    await start($)
    // The band's column holds the mod's keyed Box, and that holds the row of pills.
    const row = async (ui: any) => ((await ui.drawn()) as any).children.find((c: any) => c.props?.key === 'band:usage-meter').children[0]

    const tall = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect((await row(tall)).props.marginTop).toBe(1)
    await tall.unmount()

    const short = await $.ui.mount({
      plugin: 'usage-meter',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 1, bodyColumns: 120 },
    } as any)
    expect((await row(short)).props.marginTop).toBe(0)
    expect(await line(short)).toContain(' Session: 50.0% ')
    await short.unmount()
  })

  test('flat pills off the terminal', async ($, on) => {
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

  test('caps set to none draws flat pills in the terminal too', { options: { caps: 'none' } }, async ($, on) => {
    engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }] })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toBe(' Model: Opus 5.5  Session: 50.0%  Reset: 19m ')
    await ui.unmount()
  })

  test('the session pill follows the thresholds and the countdown ticks', async ($, on) => {
    const { clock } = engine(on, { rateLimits: [{ kind: 'five_hour', percentUsed: 74.9, resetsAt: at(46 * MIN) }] })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect((await pill(ui, /Session: 74\.9%/))?.props?.backgroundColor).toBe(BLUE)
    expect(await line(ui)).toContain(' Reset: 46m ')

    await clock.advance(MIN)
    expect(await line(ui)).toContain(' Reset: 45m ')

    await measure($, [{ kind: 'five_hour', percentUsed: 75, resetsAt: at(46 * MIN) }])
    expect((await pill(ui, /Session: 75\.0%/))?.props?.backgroundColor).toBe(AMBER)
    await measure($, [{ kind: 'five_hour', percentUsed: 89.9, resetsAt: at(46 * MIN) }])
    expect((await pill(ui, /Session: 89\.9%/))?.props?.backgroundColor).toBe(AMBER)
    await measure($, [{ kind: 'five_hour', percentUsed: 90, resetsAt: at(46 * MIN) }])
    expect((await pill(ui, /Session: 90\.0%/))?.props?.backgroundColor).toBe(RED)
    await ui.unmount()
  })

  test('a /model switch and a new context reading show up', async ($, on) => {
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

  test('the other windows show only once they run high', async ($, on) => {
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
    expect(await line(ui)).toContain(` Session: 42.0% ${CAP_RIGHT} Reset: 2h10 ${CAP_RIGHT} Week: 78.0% · 3d4h ${CAP_RIGHT}`)
    expect((await pill(ui, /Week/))?.props?.backgroundColor).toBe(AMBER)
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

  test('a window past its reset time hides until a fresh reading; spend over 100% stays red', async ($, on) => {
    const { clock } = engine(on, {
      rateLimits: [
        { kind: 'five_hour', percentUsed: 96, resetsAt: at(10 * MIN) },
        { kind: 'spend_limit', percentUsed: 120 },
      ],
    })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toContain(` Session: 96.0% ${CAP_RIGHT} Reset: 10m ${CAP_RIGHT} Spend: 120.0% ${CAP_RIGHT}`)
    expect((await pill(ui, /Session/))?.props?.backgroundColor).toBe(RED)
    expect((await pill(ui, /Spend/))?.props?.backgroundColor).toBe(RED)

    await clock.advance(11 * MIN)
    // The spend limit is the first window now, and it has no reset time to count down to.
    expect(await line(ui)).toBe(`${CAP_LEFT} Model: Opus 5.5 ${CAP_RIGHT} Spend: 120.0% ${CAP_RIGHT}`)
    await ui.unmount()
  })

  test('yields the band to a survey', async ($, on) => {
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

  test('no subscription: the model and the context alone', async ($, on) => {
    engine(on, { rateLimits: [], context: { tokens: 50_000, window: 200_000, percent: 25 } })
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toBe(`${CAP_LEFT} Model: Opus 5.5 ${CAP_RIGHT} Ctx Used: 25.0% ${CAP_RIGHT}`)
    await ui.unmount()
  })

  test('nothing to show: the line hides', async ($, on) => {
    const { session } = engine(on, { rateLimits: [] })
    session.model = ''
    await start($)
    const ui = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band() } as any)
    expect(await line(ui)).toBe('')
    expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()
    await ui.unmount()
  })

  test('narrow terminals drop the model first, then the context, then the countdown', async ($, on) => {
    engine(on, {
      context: { tokens: 14_000, window: 200_000, percent: 7 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 50, resetsAt: at(19 * MIN) }],
    })
    await start($)
    // The whole row is 66 cells, padding aside: 18 + 17 + 17 + 13 for the pills and their caps, 1 for the first cap.
    const wide = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(68) } as any)
    expect(await line(wide)).toContain('Model')
    await wide.unmount()

    const mid = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(67) } as any)
    expect(await line(mid)).toBe(`${CAP_LEFT} Ctx Used: 7.0% ${CAP_RIGHT} Session: 50.0% ${CAP_RIGHT} Reset: 19m ${CAP_RIGHT}`)
    await mid.unmount()

    const thin = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(33) } as any)
    expect(await line(thin)).toBe(`${CAP_LEFT} Session: 50.0% ${CAP_RIGHT} Reset: 19m ${CAP_RIGHT}`)
    await thin.unmount()

    const tiny = await $.ui.mount({ plugin: 'usage-meter', surface: 'terminal', ...band(22) } as any)
    expect(await line(tiny)).toBe(`${CAP_LEFT} Session: 50.0% ${CAP_RIGHT}`)
    await tiny.unmount()
  })

  test('keys its band and follows the band order file', async ($, on) => {
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
    expect(root.props.key).toBe('bands')
    // with no order it would sit above where-am-i; the order file puts it last
    expect(root.children.map((c: any) => c.props.key)).toEqual(['band:where-am-i', 'band:usage-meter'])
    expect(await line(ui)).toContain(' Session: 42.0% ')
    await ui.unmount()
    resetBandOrder()
  })
})
