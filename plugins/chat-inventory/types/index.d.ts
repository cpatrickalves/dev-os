/** One call a connector made in this chat. */
export type CallRow = {
  /** Humanised tool name: "search threads". */
  tool: string
  /** The main argument, short: a query, an id, a file name. */
  summary: string
  /** Milliseconds since the epoch; 0 when unknown. */
  at: number
  /** True for a CLI call made through Bash. */
  cli: boolean
}

/** One connector, with every call it made. */
export type ConnectorRow = {
  /** Logo key and press address: "gmail", "fireflies". */
  key: string
  name: string
  count: number
  /** Order of last use: higher is newer. */
  seq: number
  /** Used through a CLI in Bash. */
  cli: boolean
  /** Used through an MCP tool. */
  mcp: boolean
  /** Newest last; capped. */
  calls: CallRow[]
}

/** One skill, with how many times this chat used it. */
export type SkillRow = {
  name: string
  count: number
  seq: number
  /** Loaded at start through a memory file (CLAUDE.md import). */
  always: boolean
}

/** One file in the chat's context. */
export type FileRow = {
  /** Absolute path. */
  path: string
  /** True for a memory file the chat loaded at start (CLAUDE.md, AGENTS.md, MEMORY.md). */
  auto: boolean
  seq: number
}

export type Inventory = {
  connectors: ConnectorRow[]
  files: FileRow[]
  skills: SkillRow[]
}

/** One step of this chat's to-do list. */
export type PlanStep = {
  text: string
  status: 'pending' | 'in_progress' | 'completed'
  /** TodoWrite's present-tense form, shown while the step is in progress. */
  active?: string
  /** TaskCreate's id, so TaskUpdate finds the step. */
  id?: string
}

/** The to-do list: from the shared plan file, or from Claude's own plan tool calls. Newest wins. */
export type Plan = {
  title: string
  steps: PlanStep[]
  /** Milliseconds since the epoch of the last change; 0 for none. */
  updatedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'chat-inventory': {
      inv: Inventory
      /** The to-do list shown at the top of the pane. */
      plan: Plan
      /** Key of the connector whose call list is open; '' for none. */
      open: string
      /** True when switches.json turns the mod off. */
      off: boolean
      /** Sections the person closed with the header arrow: todo, connectors, files, skills. */
      folded: string[]
      /** First context file row shown in the 10-row window. */
      fileTop: number
    }
  }
}
