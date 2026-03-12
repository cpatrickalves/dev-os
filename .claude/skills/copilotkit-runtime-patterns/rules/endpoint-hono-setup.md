---
title: Configure Hono Endpoint for Edge
impact: HIGH
impactDescription: Hono enables edge runtime deployment for lower latency
tags: endpoint, hono, edge, setup
---

## Configure Hono Endpoint for Edge

Use Hono for edge runtime deployments (Cloudflare Workers, Vercel Edge). Use `createCopilotEndpointHono` from `@copilotkitnext/runtime/hono` to mount the runtime.

**Incorrect (old API — class method handler):**

```typescript
import { Hono } from "hono"
import { CopilotKitRuntime } from "@copilotkit/runtime"

const app = new Hono()
const runtime = new CopilotKitRuntime({ agents: [myAgent] })

app.all("/api/copilotkit", runtime.honoHandler())
```

**Correct (functional endpoint with `CopilotRuntime`):**

```typescript
import { Hono } from "hono"
import { cors } from "hono/cors"
import { CopilotRuntime } from "@copilotkitnext/runtime"
import { createCopilotEndpointHono } from "@copilotkitnext/runtime/hono"

const app = new Hono()
app.use("/api/copilotkit/*", cors({ origin: process.env.FRONTEND_URL }))

const runtime = new CopilotRuntime({
  agents: {
    default: myAgent,
  },
})

app.route("/api/copilotkit", createCopilotEndpointHono({ runtime }))

export default app
```

Key points:
- Use `CopilotRuntime` from `@copilotkitnext/runtime` (not `CopilotKitRuntime`)
- Use `createCopilotEndpointHono` (not `runtime.honoHandler()`)
- Use `app.route()` (not `app.all()`) — the endpoint creates its own sub-routes
- Agents are registered as a dictionary `{ name: instance }` (not an array)

Reference: [Hono Setup](https://docs.copilotkit.ai/guides/self-hosting/hono)
