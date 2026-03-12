---
title: Configure Multi-Agent Routing
impact: HIGH
impactDescription: ambiguous routing sends requests to wrong agents
tags: runner, multi-agent, routing, dictionary
---

## Configure Multi-Agent Routing

When registering multiple agents, each key in the agents dictionary must be unique and match the `agent` param used in the frontend `useAgent` hook. Mix different agent types as needed.

**Incorrect (duplicate keys or array-based registration):**

```typescript
const runtime = new CopilotRuntime({
  agents: [
    new BuiltInAgent({ name: "agent", tools: [searchTool] }),
    new BuiltInAgent({ name: "agent", tools: [writeTool] }),
  ],
})
```

**Correct (unique keys with typed agents):**

```typescript
import { CopilotRuntime, ExperimentalEmptyAdapter } from "@copilotkit/runtime"
import { LangGraphAgent, LangGraphHttpAgent } from "@copilotkit/runtime/langgraph"
import { HttpAgent } from "@ag-ui/client"

const runtime = new CopilotRuntime({
  agents: {
    researcher: new LangGraphAgent({
      deploymentUrl: "http://localhost:8123",
      graphId: "researcher",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    }),
    writer: new LangGraphHttpAgent({
      url: "http://localhost:8124",
    }),
    custom_agent: new HttpAgent({
      url: "http://localhost:8000/",
    }),
  },
})

// Frontend:
// useAgent({ agent: "researcher" })
// useAgent({ agent: "writer" })
// useAgent({ agent: "custom_agent" })
```

Key points:
- Dictionary keys = agent names used for routing
- Different agent types can coexist in the same runtime
- `LangGraphAgent` for LangGraph Cloud deployments
- `LangGraphHttpAgent` for self-hosted LangGraph via HTTP
- `HttpAgent` for any AG-UI protocol compatible agent (Python FastAPI, etc.)

Reference: [Multi-Agent Setup](https://docs.copilotkit.ai/guides/multi-agent)
