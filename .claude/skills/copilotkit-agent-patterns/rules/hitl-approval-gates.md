---
title: Use Tool Calls for Approval Gates
impact: MEDIUM
impactDescription: custom events for approvals break the standard AG-UI flow
tags: hitl, approval, tool-calls, gates
---

## Use Tool Calls for Approval Gates

Implement human-in-the-loop approval gates as tool calls that the frontend renders with `useHumanInTheLoop` (preferred) or `useRenderToolCall`, rather than custom event types. This keeps the approval flow within the standard AG-UI protocol and lets you use CopilotKit's built-in HITL handling.

**Incorrect (custom event type for approval):**

```typescript
yield { type: "CUSTOM_EVENT", eventType: "APPROVAL_NEEDED", data: { action: "delete_records", count: 50 } }
// Frontend has no standard way to handle this
```

**Correct (agent emits tool call, frontend handles with useHumanInTheLoop):**

Agent side:
```typescript
yield { type: "TOOL_CALL_START", toolCallId: "tc_1", toolName: "confirm_deletion" }
yield {
  type: "TOOL_CALL_ARGS",
  toolCallId: "tc_1",
  delta: JSON.stringify({ action: "delete_records", count: 50, message: "Delete 50 records?" }),
}
yield { type: "TOOL_CALL_END", toolCallId: "tc_1" }
```

Frontend side:
```typescript
import { useHumanInTheLoop } from "@copilotkit/react-core"

useHumanInTheLoop({
  name: "confirm_deletion",
  description: "Ask user to confirm record deletion",
  parameters: [
    { name: "action", type: "string", description: "The action to confirm", required: true },
    { name: "count", type: "number", description: "Number of records", required: true },
    { name: "message", type: "string", description: "Confirmation message", required: true },
  ],
  render: ({ args, respond, status }) => {
    if (status === "executing" && respond) {
      return (
        <ConfirmDialog
          message={args.message}
          onConfirm={() => respond(true)}
          onCancel={() => respond(false)}
        />
      )
    }
    return null
  },
})
```

Note: `useHumanInTheLoop` uses a `render` prop (not `renderAndWaitForResponse`). Always check that `respond` exists before calling it.

Reference: [Human-in-the-Loop](https://docs.copilotkit.ai/direct-to-llm/guides/generative-ui)
