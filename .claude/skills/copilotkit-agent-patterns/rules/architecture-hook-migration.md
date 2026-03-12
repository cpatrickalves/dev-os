---
title: Migrate from useCopilotAction to Specialized Hooks
impact: HIGH
impactDescription: useCopilotAction is deprecated; using it causes type safety issues and unclear intent
tags: architecture, migration, hooks, deprecation
---

## Migrate from useCopilotAction to Specialized Hooks

`useCopilotAction` is deprecated in favor of three specialized hooks that provide better type safety and clearer intent:

| Old Hook | New Hook | Use Case |
|----------|----------|----------|
| `useCopilotAction` with `handler` | `useFrontendTool` | Frontend-executed tools |
| `useCopilotAction` with `renderAndWaitForResponse` | `useHumanInTheLoop` | Interactive workflows needing user input |
| `useCopilotAction` with `render` (no handler) | `useRenderToolCall` | Rendering backend tool calls |

**Incorrect (deprecated useCopilotAction with renderAndWaitForResponse):**

```typescript
useCopilotAction({
  name: "confirmAction",
  parameters: [
    { name: "message", type: "string", required: true },
  ],
  renderAndWaitForResponse: ({ args, respond, status }) => {
    return (
      <ConfirmDialog
        message={args.message}
        onConfirm={() => respond(true)}
        onCancel={() => respond(false)}
        isActive={status === "executing"}
      />
    )
  },
})
```

**Correct (useHumanInTheLoop):**

```typescript
import { useHumanInTheLoop } from "@copilotkit/react-core"

useHumanInTheLoop({
  name: "confirmAction",
  parameters: [
    { name: "message", type: "string", description: "The message to display", required: true },
  ],
  render: ({ args, respond, status }) => {
    if (status === "executing" && respond) {
      return (
        <ConfirmDialog
          message={args.message}
          onConfirm={() => respond(true)}
          onCancel={() => respond(false)}
          isActive={true}
        />
      )
    }
    return null
  },
})
```

**Key migration differences:**
1. Property is `render` instead of `renderAndWaitForResponse`
2. Must check `respond` exists before calling it (`status === "executing" && respond`)
3. Parameters require a `description` field for better LLM context

**Correct (useFrontendTool for tools with handlers):**

```typescript
import { useFrontendTool } from "@copilotkit/react-core"

useFrontendTool({
  name: "addToCart",
  description: "Add a product to the shopping cart",
  parameters: [
    { name: "productId", type: "string", description: "Product ID", required: true },
    { name: "quantity", type: "number", description: "Quantity to add", required: true },
  ],
  handler: async ({ productId, quantity }) => {
    await cartService.add(productId, quantity)
    return { success: true }
  },
})
```

Reference: [Hook Migration](https://docs.copilotkit.ai/reference/hooks/useHumanInTheLoop)
