---
title: Use BuiltInAgent for Direct-to-LLM Agents
impact: CRITICAL
impactDescription: BuiltInAgent handles AG-UI protocol automatically
tags: architecture, BuiltInAgent, setup
---

## Use BuiltInAgent for Direct-to-LLM Agents

For agents that primarily need tool-calling capabilities without complex state graphs, use `BuiltInAgent` from `@copilotkitnext/agent`. It handles AG-UI protocol event emission, message management, and streaming automatically. Only reach for custom agents or LangGraph when you need multi-step workflows or complex state.

Install the required packages:

```bash
npm install @copilotkitnext/runtime @copilotkitnext/agent express
```

**Incorrect (manual AG-UI event handling for a simple agent):**

```typescript
import { Agent } from "@ag-ui/core"

class MyAgent extends Agent {
  async run(input: RunInput) {
    const stream = new EventStream()
    stream.emit({ type: "RUN_STARTED" })
    stream.emit({ type: "TEXT_MESSAGE_START", messageId: "1" })
    // ... 50+ lines of manual event handling
    return stream
  }
}
```

**Correct (BuiltInAgent with CopilotRuntime):**

```typescript
import { CopilotRuntime } from "@copilotkitnext/runtime"
import { BuiltInAgent } from "@copilotkitnext/agent"

const agent = new BuiltInAgent({
  model: "openai/gpt-4o",
  systemPrompt: "You are a helpful shopping assistant.",
})

const runtime = new CopilotRuntime({
  agents: { default: agent },
})
```

`BuiltInAgent` replaces the older adapter pattern (`OpenAIAdapter`, `AnthropicAdapter`) with a unified interface that uses the `"provider/model"` string format. Note: the package moved from `@copilotkit/runtime/v2` to `@copilotkitnext/agent`.

Reference: [BuiltInAgent](https://docs.copilotkit.ai/guides/self-hosting)
