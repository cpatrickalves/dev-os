export type BrainDumpState = {
  /** False after /shape turns the mod off. Mirrors the store. */
  enabled: boolean
}

declare module 'claude-code' {
  interface PluginState {
    "brain-dump": { enabled: boolean }
  }
}
