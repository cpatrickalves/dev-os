---
title: Use beforeRequest for Auth and Logging
impact: MEDIUM
impactDescription: centralizes cross-cutting concerns before agent execution
tags: middleware, beforeRequest, auth, logging
---

## Use beforeRequest for Auth and Logging

Use the `beforeRequest` middleware hook to handle authentication, logging, and context injection before the agent processes a request. This centralizes cross-cutting concerns and keeps agent code focused on business logic.

**Incorrect (auth logic inside each agent):**

```typescript
class ResearchAgent {
  async run(input: RunInput) {
    const token = input.headers?.authorization
    if (!verifyToken(token)) throw new Error("Unauthorized")
    // ... agent logic
  }
}
```

**Correct (auth in beforeRequest middleware):**

```typescript
const runtime = new CopilotRuntime({
  agents: { researcher: researchAgent, writer: writerAgent },
  middleware: {
    beforeRequest: async (req) => {
      const token = req.headers.get("authorization")?.replace("Bearer ", "")
      if (!token || !await verifyToken(token)) {
        throw new Response("Unauthorized", { status: 401 })
      }
      req.context = { userId: decodeToken(token).sub }
      return req
    },
  },
})
```

Reference: [Middleware](https://docs.copilotkit.ai/reference/runtime/middleware)
