---
title: Use useAgent Hook for React Agent Integration
impact: CRITICAL
impactDescription: useAgent is the primary interface for agent state, subscriptions, and multi-agent execution
tags: architecture, useAgent, react, hooks, v2
---

## Use useAgent Hook for React Agent Integration

The `useAgent` hook from `@copilotkit/react-core/v2` is the primary interface for integrating agents into React components. It provides access to agent state, state mutation, event subscriptions, and supports multi-agent execution.

**Incorrect (using legacy patterns for agent interaction):**

```typescript
import { useCopilotChat } from "@copilotkit/react-core"

function MyComponent() {
  const { messages, sendMessage } = useCopilotChat()
  // No access to agent state, no subscription support
}
```

**Correct (useAgent hook with state and subscriptions):**

```typescript
import { useAgent } from "@copilotkit/react-core/v2"
import type { AgentSubscriber } from "@ag-ui/client"
import { useEffect } from "react"

function MyComponent() {
  const { agent } = useAgent({ agentId: "my-agent" })

  // Access and mutate agent state
  const currentState = agent.state
  agent.setState({ ...currentState, step: "processing" })

  // Subscribe to agent events
  useEffect(() => {
    const subscriber: AgentSubscriber = {
      onRunStartedEvent: () => console.log("Agent started"),
      onRunFinalized: () => console.log("Agent finished"),
      onStateChanged: (state) => console.log("State:", state),
      onCustomEvent: ({ event }) => console.log("Custom:", event.name, event.value),
    }
    const { unsubscribe } = agent.subscribe(subscriber)
    return () => unsubscribe()
  }, [])

  return <div>{/* ... */}</div>
}
```

**Multi-agent execution:**

```typescript
const { agent: langgraph } = useAgent({ agentId: "langgraph" })
const { agent: pydantic } = useAgent({ agentId: "pydantic" })

// Run multiple agents in parallel
;[langgraph, pydantic].forEach((agent) => {
  agent.addMessage({ id: crypto.randomUUID(), role: "user", content: message })
  agent.runAgent()
})
```

Reference: [useAgent Hook](https://docs.copilotkit.ai/direct-to-llm/guides/use-agent-hook)
