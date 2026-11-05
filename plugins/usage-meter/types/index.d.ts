export type UsageMeterWindow = { kind: string; percentUsed: number; resetsAt?: string }
// model: the main loop's model as the engine names it. effort: the level its last request asked for
// (`low` to `max`). contextPercent: the context window's fill, 0 to 100.
export type UsageMeterSnapshot = { rateLimits: UsageMeterWindow[]; model?: string; effort?: string; contextPercent?: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-meter': {
      snapshot: UsageMeterSnapshot | null
      tick: number
      warned: Record<string, number>
    }
  }
}
