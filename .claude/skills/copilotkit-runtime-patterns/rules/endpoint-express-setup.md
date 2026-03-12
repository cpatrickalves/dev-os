---
title: Configure Express Endpoint
impact: CRITICAL
impactDescription: missing CORS or wrong setup blocks all frontend connections
tags: endpoint, express, CORS, setup
---

## Configure Express Endpoint

When using Express, use `createCopilotEndpointExpress` from `@copilotkitnext/runtime/express` to mount the CopilotKit runtime. Configure CORS to allow your frontend origin. Missing CORS headers cause the browser to block all requests.

**Incorrect (old API — class method handler):**

```typescript
import express from "express"
import { CopilotKitRuntime } from "@copilotkit/runtime"

const app = express()
const runtime = new CopilotKitRuntime({ agents: [myAgent] })

app.use("/api/copilotkit", runtime.expressHandler())
app.listen(3001)
```

**Correct (functional endpoint with `CopilotRuntime`):**

```typescript
import express from "express"
import cors from "cors"
import { CopilotRuntime } from "@copilotkitnext/runtime"
import { createCopilotEndpointExpress } from "@copilotkitnext/runtime/express"

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }))

const runtime = new CopilotRuntime({
  agents: {
    default: myAgent,
  },
})

app.use("/api/copilotkit", createCopilotEndpointExpress({ runtime }))

app.listen(3001)
```

Key points:
- Use `CopilotRuntime` from `@copilotkitnext/runtime` (not `CopilotKitRuntime` from `@copilotkit/runtime`)
- Use `createCopilotEndpointExpress` (not `runtime.expressHandler()`)
- Agents are registered as a dictionary `{ name: instance }` (not an array)
- CORS must be configured separately via Express middleware

Reference: [Express Setup](https://docs.copilotkit.ai/guides/self-hosting/express)
