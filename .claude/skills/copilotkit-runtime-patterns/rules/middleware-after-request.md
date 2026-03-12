---
title: Use afterRequest for Response Modification
impact: LOW
impactDescription: enables response logging and cleanup without modifying agents
tags: middleware, afterRequest, response, cleanup
---

## Use afterRequest for Response Modification

Use the `afterRequest` middleware hook for logging completed requests, tracking usage metrics, or cleaning up resources. This runs after the agent response stream has completed.

**Incorrect (logging inside agent, couples concerns):**

```typescript
class ResearchAgent {
  async run(input: RunInput) {
    const start = Date.now()
    // ... agent logic
    console.log(`Agent took ${Date.now() - start}ms`)
    await cleanupTempFiles()
  }
}
```

**Correct (afterRequest for logging and cleanup):**

```typescript
const runtime = new CopilotRuntime({
  agents: { researcher: researchAgent },
  middleware: {
    afterRequest: async (req, res) => {
      await logUsage({
        agentId: req.agentId,
        userId: req.context?.userId,
        duration: res.duration,
        tokenCount: res.tokenCount,
      })
      await cleanupTempFiles(req.threadId)
    },
  },
})
```

Reference: [Middleware](https://docs.copilotkit.ai/reference/runtime/middleware)
