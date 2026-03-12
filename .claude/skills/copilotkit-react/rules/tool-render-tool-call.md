---
title: Use useRenderToolCall for Display-Only Rendering
impact: MEDIUM
impactDescription: using useCopilotAction for render-only creates unnecessary handler overhead
tags: tool, rendering, useRenderToolCall, migration
---

## Use useRenderToolCall for Display-Only Rendering

When you only need to render UI for a tool call without side effects, use `useRenderToolCall` instead of `useCopilotAction` with a `render` prop. This hook is purpose-built for display-only tool rendering and replaces the `useCopilotAction` render-only pattern.

**Incorrect (useCopilotAction for render-only, v1 legacy):**

```tsx
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "showResult",
  render: ({ args }) => <ResultCard {...args} />,
});
```

**Correct (useRenderToolCall for display-only):**

```tsx
import { useRenderToolCall } from "@copilotkit/react-core";

useRenderToolCall({
  name: "showResult",
  render: ({ args }) => <ResultCard {...args} />,
});
```

**When to use which hook:**

| Hook | Use Case |
|------|----------|
| `useRenderToolCall` | Display-only rendering of agent tool calls (no side effects) |
| `useFrontendTool` | Tool with side effects + optional `render` prop |
| `useRenderTool` (v2) | Typed rendering with Zod schemas and streaming support |
| `useHumanInTheLoop` | Interactive tool that pauses for user input |

For rendering backend tools that the agent calls (where you want to show progress or results in the UI without executing anything on the frontend), use `useCopilotAction` with `available: "disabled"` and a `render` function:

```tsx
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "get_weather",
  available: "disabled",
  render: ({ status, args }) => (
    <p className="text-gray-500 mt-2">
      {status !== "complete" && "Calling weather API..."}
      {status === "complete" && `Weather fetched for ${args.location}.`}
    </p>
  ),
});
```

Reference: [useRenderToolCall](https://docs.copilotkit.ai/reference/hooks/useRenderToolCall) | [useCopilotAction](https://docs.copilotkit.ai/reference/v1/hooks/useCopilotAction)
