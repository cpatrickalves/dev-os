---
title: Use useHumanInTheLoop for Interactive Approvals
impact: HIGH
impactDescription: missing human-in-the-loop causes agents to execute without user consent
tags: agent, hooks, useHumanInTheLoop, approval, interactive
---

## Use useHumanInTheLoop for Interactive Approvals

Use `useHumanInTheLoop` when an agent tool call needs to pause execution and wait for user input before proceeding. This replaces the older `renderAndWaitForResponse` pattern from `useCopilotAction`. Always check that the `respond` function exists before rendering interactive controls.

**Incorrect (old renderAndWaitForResponse pattern):**

```tsx
import { useCopilotAction } from "@copilotkit/react-core";

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
    );
  },
});
```

**Correct (useHumanInTheLoop with respond guard):**

```tsx
import { useHumanInTheLoop } from "@copilotkit/react-core";

useHumanInTheLoop({
  name: "confirmAction",
  parameters: [
    {
      name: "message",
      type: "string",
      description: "The message to display",
      required: true,
    },
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
      );
    }
    return null;
  },
});
```

Key differences from the old pattern:
- Hook name changes from `useCopilotAction` to `useHumanInTheLoop`
- Property name changes from `renderAndWaitForResponse` to `render`
- Always guard `respond` with an existence check (`respond` is only available during `"executing"` status)

Reference: [useHumanInTheLoop](https://docs.copilotkit.ai/reference/hooks/useHumanInTheLoop)
