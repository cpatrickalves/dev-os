---
title: Authenticate Before Agent Execution
impact: CRITICAL
impactDescription: unauthenticated endpoints expose LLM capabilities to anyone
tags: security, auth, middleware, authentication
---

## Authenticate Before Agent Execution

Always authenticate requests before they reach the agent. An unauthenticated CopilotKit endpoint lets anyone invoke your agents and consume your LLM tokens. Use the `beforeRequest` middleware to validate tokens.

**Incorrect (no auth, open to public):**

```typescript
const runtime = new CopilotRuntime({
  agents: { default: myAgent },
})

app.use("/api/copilotkit", createCopilotEndpointExpress({ runtime }))
```

**Correct (JWT auth before agent execution):**

```typescript
const runtime = new CopilotRuntime({
  agents: { default: myAgent },
  middleware: {
    beforeRequest: async (req) => {
      const token = req.headers.get("authorization")?.replace("Bearer ", "")
      if (!token) throw new Response("Missing token", { status: 401 })

      const payload = await verifyJwt(token)
      if (!payload) throw new Response("Invalid token", { status: 403 })

      req.context = { userId: payload.sub, role: payload.role }
      return req
    },
  },
})
```

Reference: [Security](https://docs.copilotkit.ai/guides/security)
