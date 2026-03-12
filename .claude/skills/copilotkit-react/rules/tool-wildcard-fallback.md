---
title: Register Default Renderer as Fallback
impact: MEDIUM
impactDescription: prevents missing UI when agent calls unregistered tools
tags: tool, rendering, wildcard, fallback, useDefaultTool
---

## Register Default Renderer as Fallback

Use `useDefaultTool` to catch tool calls that don't have a dedicated renderer. Without a fallback, unregistered tool calls render nothing in the chat, confusing users. The `useDefaultTool` hook replaces the older wildcard `"*"` pattern with `useRenderTool`.

**Incorrect (no fallback, unknown tools render blank):**

```tsx
import { useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";

useRenderTool({
  name: "show_chart",
  parameters: z.object({ data: z.array(z.number()) }),
  render: ({ parameters }) => <Chart data={parameters.data} />,
})
```

**Correct (useDefaultTool as fallback renderer):**

```tsx
import { useRenderTool } from "@copilotkit/react-core/v2";
import { useDefaultTool } from "@copilotkit/react-core";
import { z } from "zod";

useRenderTool({
  name: "show_chart",
  parameters: z.object({ data: z.array(z.number()) }),
  render: ({ parameters }) => <Chart data={parameters.data} />,
})

useDefaultTool({
  render: ({ name, args, status, result }) => (
    <GenericToolCard
      name={name}
      args={args}
      status={status}
      result={result}
    />
  ),
})
```

**Legacy alternative (wildcard `"*"` still works but prefer useDefaultTool):**

```tsx
useRenderTool({
  name: "*",
  render: ({ name, parameters, status }) => (
    <GenericToolCard toolName={name} args={parameters} isLoading={status === "inProgress"} />
  ),
})
```

Reference: [useDefaultTool](https://docs.copilotkit.ai/reference/hooks/useDefaultTool) | [useRenderTool (v2)](https://docs.copilotkit.ai/reference/v2/hooks/useRenderTool)
