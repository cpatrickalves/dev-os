---
title: Emit Tool Calls That Map to Frontend Render Hooks
impact: MEDIUM
impactDescription: mismatched tool names cause blank renders in the frontend
tags: genui, tool-call, useRenderToolCall, useFrontendTool, mapping
---

## Emit Tool Calls That Map to Frontend Render Hooks

When emitting tool calls that should render UI in the frontend, ensure the `toolName` matches exactly what the frontend has registered with `useRenderToolCall` (for backend tool visualization) or `useFrontendTool` (for frontend-executed tools). Mismatched names cause the tool call to render nothing.

**Incorrect (tool name mismatch between agent and frontend):**

```typescript
// Agent emits:
yield { type: "TOOL_CALL_START", toolCallId: "tc_1", toolName: "showWeather" }

// Frontend registers:
useRenderToolCall({ name: "show_weather", render: ({ args }) => <WeatherCard {...args} /> })
// Names don't match — nothing renders
```

**Correct (matching tool names):**

```typescript
// Agent emits:
yield { type: "TOOL_CALL_START", toolCallId: "tc_1", toolName: "show_weather" }

// Frontend registers (for rendering backend tool calls):
useRenderToolCall({ name: "show_weather", render: ({ args }) => <WeatherCard {...args} /> })

// Or for frontend-executed tools:
useFrontendTool({
  name: "show_weather",
  description: "Display weather information",
  parameters: [{ name: "location", type: "string", required: true }],
  handler: async ({ location }) => { /* ... */ },
  render: ({ args }) => <WeatherCard {...args} />,
})
```

Note: `useCopilotAction` is deprecated. Use `useFrontendTool` for tools with handlers, `useHumanInTheLoop` for interactive approval flows, and `useRenderToolCall` for rendering backend tool calls.

Establish a naming convention (e.g., `snake_case`) and share tool name constants between agent and frontend.

Reference: [Generative UI](https://docs.copilotkit.ai/direct-to-llm/guides/generative-ui)
