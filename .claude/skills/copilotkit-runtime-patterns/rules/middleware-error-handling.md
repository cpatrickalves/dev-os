---
title: Handle Middleware Errors Gracefully
impact: MEDIUM
impactDescription: unhandled middleware errors crash the runtime for all users
tags: middleware, error, handling, resilience
---

## Handle Middleware Errors Gracefully

Wrap middleware logic in try/catch to prevent individual request failures from crashing the entire runtime. Return appropriate HTTP error responses instead of letting exceptions propagate.

**Incorrect (unhandled error crashes runtime):**

```typescript
const runtime = new CopilotRuntime({
  middleware: {
    beforeRequest: async (req) => {
      const user = await fetchUser(req.headers.get("x-user-id"))
      req.context = { user: user.data }
      return req
    },
  },
})
```

**Correct (graceful error handling):**

```typescript
const runtime = new CopilotRuntime({
  middleware: {
    beforeRequest: async (req) => {
      try {
        const user = await fetchUser(req.headers.get("x-user-id"))
        req.context = { user: user.data }
      } catch (error) {
        console.error("Middleware error:", error)
        throw new Response("Internal Server Error", { status: 500 })
      }
      return req
    },
  },
})
```

Reference: [Middleware](https://docs.copilotkit.ai/reference/runtime/middleware)
