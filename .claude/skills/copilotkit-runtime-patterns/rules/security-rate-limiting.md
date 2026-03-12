---
title: Rate Limit by User or API Key
impact: HIGH
impactDescription: unbounded access lets single users exhaust LLM budget
tags: security, rate-limiting, abuse, budget
---

## Rate Limit by User or API Key

Add rate limiting to your CopilotKit runtime endpoint to prevent individual users from exhausting your LLM budget. Rate limit by authenticated user ID or API key, not just IP address (which doesn't work behind proxies/VPNs).

**Incorrect (no rate limiting):**

```typescript
app.use("/api/copilotkit", createCopilotEndpointExpress({ runtime }))
```

**Correct (rate limiting by user ID):**

```typescript
import { RateLimiter } from "rate-limiter-flexible"

const limiter = new RateLimiter({
  points: 50,
  duration: 60,
  keyPrefix: "copilotkit",
})

const runtime = new CopilotRuntime({
  agents: { default: myAgent },
  middleware: {
    beforeRequest: async (req) => {
      const userId = req.context?.userId
      if (!userId) throw new Response("Unauthorized", { status: 401 })

      try {
        await limiter.consume(userId)
      } catch {
        throw new Response("Rate limit exceeded", { status: 429 })
      }
      return req
    },
  },
})
```

Reference: [Security](https://docs.copilotkit.ai/guides/security)
