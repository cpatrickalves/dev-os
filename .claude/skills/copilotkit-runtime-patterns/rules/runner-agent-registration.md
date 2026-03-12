---
title: Register Agents as Named Dictionary Entries
impact: HIGH
impactDescription: incorrect agent registration prevents routing and breaks the runtime
tags: runner, agents, registration, dictionary
---

## Register Agents as Named Dictionary Entries

Agents are registered as a dictionary where keys are agent names and values are agent instances. The key is used for routing (matching `agent` from the frontend `useAgent` hook). Use typed agent classes: `LangGraphAgent`, `LangGraphHttpAgent`, or `HttpAgent`.

**Incorrect (old API — array of `BuiltInAgent`):**

```typescript
const runtime = new CopilotRuntime({
  agents: [
    new BuiltInAgent({ name: "researcher", tools: [searchTool] }),
  ],
})
```

**Correct (dictionary with typed agent classes):**

```typescript
import { CopilotRuntime } from "@copilotkit/runtime"
import { LangGraphAgent } from "@copilotkit/runtime/langgraph"

const runtime = new CopilotRuntime({
  agents: {
    researcher: new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
      graphId: "researcher",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    }),
  },
})
```

Available agent types:
- `LangGraphAgent` — direct LangGraph integration (requires `deploymentUrl`, `graphId`)
- `LangGraphHttpAgent` — HTTP-based LangGraph backend (requires `url`)
- `HttpAgent` (from `@ag-ui/client`) — generic AG-UI protocol agent (requires `url`)

Reference: [Agent Registration](https://docs.copilotkit.ai/reference/runtime/agents)
