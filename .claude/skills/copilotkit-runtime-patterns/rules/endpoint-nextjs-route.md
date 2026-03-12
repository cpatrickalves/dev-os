---
title: Set Up Next.js API Route Handler
impact: CRITICAL
impactDescription: incorrect route handler config breaks streaming in Next.js
tags: endpoint, nextjs, api-route, streaming
---

## Set Up Next.js API Route Handler

For Next.js App Router, create an API route at `app/api/copilotkit/route.ts`. Use `copilotRuntimeNextJSAppRouterEndpoint` from `@copilotkit/runtime` to create the handler. A `serviceAdapter` is required — use `ExperimentalEmptyAdapter` when agents handle LLM calls.

**Incorrect (old API — `CopilotKitRuntime` class with method handler):**

```typescript
// app/api/copilotkit/[...copilotkit]/route.ts
import { CopilotKitRuntime } from "@copilotkit/runtime"

const copilotkit = new CopilotKitRuntime({ agents: [myAgent] })

export const GET = copilotkit.nextJsHandler()
export const POST = copilotkit.nextJsHandler()
```

**Correct (functional endpoint with `CopilotRuntime`):**

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime"
import { NextRequest } from "next/server"

const serviceAdapter = new ExperimentalEmptyAdapter()

const runtime = new CopilotRuntime({
  agents: {
    my_agent: new HttpAgent({ url: "http://localhost:8000/" }),
  },
})

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  })
  return handleRequest(req)
}
```

Key points:
- Use `CopilotRuntime` (not `CopilotKitRuntime`)
- Use `copilotRuntimeNextJSAppRouterEndpoint` function (not class methods)
- Simple `route.ts` (catch-all `[...copilotkit]` no longer required)
- Export only `POST` handler
- `endpoint` must match the actual route path
- `serviceAdapter` is required — `ExperimentalEmptyAdapter` when agents manage LLM calls

Reference: [Next.js Setup](https://docs.copilotkit.ai/guides/self-hosting/nextjs)
