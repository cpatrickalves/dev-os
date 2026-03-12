# CopilotKit Runtime Patterns

**Version 2.0.0**
CopilotKit
March 2026

> **Note:**
> This document is mainly for agents and LLMs to follow when maintaining,
> generating, or refactoring CopilotKit codebases. Humans
> may also find it useful, but guidance here is optimized for automation
> and consistency by AI-assisted workflows.

---

## Abstract

Server-side runtime configuration patterns for CopilotKit. Contains 15 rules covering Express/Hono/Next.js endpoint setup, agent registration (LangGraphAgent, HttpAgent, AG-UI), middleware hooks, security configuration, and performance optimization.

**Key API surface (v2.0):**
- `CopilotRuntime` (replaces `CopilotKitRuntime`)
- `copilotRuntimeNextJSAppRouterEndpoint` / `createCopilotEndpointExpress` / `createCopilotEndpointHono`
- Agents as dictionary: `agents: { name: instance }`
- Agent types: `LangGraphAgent`, `LangGraphHttpAgent`, `HttpAgent`
- `ExperimentalEmptyAdapter` as service adapter

---

## Table of Contents

1. [Endpoint Setup](#1-endpoint-setup) — **CRITICAL**
   - 1.1 [Configure Express Endpoint](#11-configure-express-endpoint)
   - 1.2 [Configure Hono Endpoint for Edge](#12-configure-hono-endpoint-for-edge)
   - 1.3 [Set Up Next.js API Route Handler](#13-set-up-nextjs-api-route-handler)
2. [Agent Runners](#2-agent-runners) — **HIGH**
   - 2.1 [Register Agents as Named Dictionary Entries](#21-register-agents-as-named-dictionary-entries)
   - 2.2 [Configure Multi-Agent Routing](#22-configure-multi-agent-routing)
   - 2.3 [Python Agent via AG-UI Protocol](#23-python-agent-via-ag-ui-protocol)
3. [Middleware](#3-middleware) — **MEDIUM**
   - 3.1 [Use beforeRequest for Auth and Logging](#31-use-beforerequest-for-auth-and-logging)
   - 3.2 [Use afterRequest for Response Modification](#32-use-afterrequest-for-response-modification)
   - 3.3 [Handle Middleware Errors Gracefully](#33-handle-middleware-errors-gracefully)
4. [Security](#4-security) — **HIGH**
   - 4.1 [Authenticate Before Agent Execution](#41-authenticate-before-agent-execution)
   - 4.2 [Configure CORS for Specific Origins](#42-configure-cors-for-specific-origins)
   - 4.3 [Rate Limit by User or API Key](#43-rate-limit-by-user-or-api-key)
5. [Performance](#5-performance) — **MEDIUM**
   - 5.1 [Prevent Proxy Buffering of Streams](#51-prevent-proxy-buffering-of-streams)

---

## 1. Endpoint Setup

**Impact: CRITICAL**

Correct endpoint configuration is required for CopilotKit to function. Use functional endpoint helpers with `CopilotRuntime` (not the old `CopilotKitRuntime` class methods).

### 1.1 Configure Express Endpoint

**Impact: CRITICAL (missing CORS or wrong setup blocks all frontend connections)**

When using Express, use `createCopilotEndpointExpress` from `@copilotkitnext/runtime/express` to mount the CopilotKit runtime. Configure CORS to allow your frontend origin.

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

Reference: [Express Setup](https://docs.copilotkit.ai/guides/self-hosting/express)

### 1.2 Configure Hono Endpoint for Edge

**Impact: HIGH (Hono enables edge runtime deployment for lower latency)**

Use `createCopilotEndpointHono` from `@copilotkitnext/runtime/hono` to mount the runtime with Hono.

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

Reference: [Hono Setup](https://docs.copilotkit.ai/guides/self-hosting/hono)

### 1.3 Set Up Next.js API Route Handler

**Impact: CRITICAL (incorrect route handler config breaks streaming in Next.js)**

For Next.js App Router, create an API route at `app/api/copilotkit/route.ts`. Use `copilotRuntimeNextJSAppRouterEndpoint` to create the handler.

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

Reference: [Next.js Setup](https://docs.copilotkit.ai/guides/self-hosting/nextjs)

## 2. Agent Runners

**Impact: HIGH**

Agents are registered as a dictionary where keys are agent names used for routing. Use typed agent classes instead of the deprecated `BuiltInAgent`.

### 2.1 Register Agents as Named Dictionary Entries

**Impact: HIGH (incorrect agent registration prevents routing and breaks the runtime)**

Agents are registered as a dictionary `{ name: instance }`. The key is used for routing from the frontend `useAgent` hook.

**Incorrect (old API — array of `BuiltInAgent`):**

```typescript
const runtime = new CopilotRuntime({
  agents: [
    new BuiltInAgent({ name: "researcher", tools: [searchTool] }),
  ],
})
```

**Correct (dictionary with typed agent classes):**

```typescript
import { CopilotRuntime } from "@copilotkit/runtime"
import { LangGraphAgent } from "@copilotkit/runtime/langgraph"

const runtime = new CopilotRuntime({
  agents: {
    researcher: new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
      graphId: "researcher",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    }),
  },
})
```

Available agent types:
- `LangGraphAgent` — direct LangGraph integration (requires `deploymentUrl`, `graphId`)
- `LangGraphHttpAgent` — HTTP-based LangGraph backend (requires `url`)
- `HttpAgent` (from `@ag-ui/client`) — generic AG-UI protocol agent (requires `url`)

Reference: [Agent Registration](https://docs.copilotkit.ai/reference/runtime/agents)

### 2.2 Configure Multi-Agent Routing

**Impact: HIGH (ambiguous routing sends requests to wrong agents)**

Each key in the agents dictionary must be unique and match the `agent` param used in the frontend.

**Correct (unique keys with typed agents):**

```typescript
import { CopilotRuntime, ExperimentalEmptyAdapter } from "@copilotkit/runtime"
import { LangGraphAgent, LangGraphHttpAgent } from "@copilotkit/runtime/langgraph"
import { HttpAgent } from "@ag-ui/client"

const runtime = new CopilotRuntime({
  agents: {
    researcher: new LangGraphAgent({
      deploymentUrl: "http://localhost:8123",
      graphId: "researcher",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    }),
    writer: new LangGraphHttpAgent({
      url: "http://localhost:8124",
    }),
    custom_agent: new HttpAgent({
      url: "http://localhost:8000/",
    }),
  },
})

// Frontend:
// useAgent({ agent: "researcher" })
// useAgent({ agent: "writer" })
// useAgent({ agent: "custom_agent" })
```

Reference: [Multi-Agent Setup](https://docs.copilotkit.ai/guides/multi-agent)

### 2.3 Python Agent via AG-UI Protocol

**Impact: HIGH (AG-UI enables Python/FastAPI agents to connect to CopilotKit runtime)**

Use `LangGraphAGUIAgent` + `add_langgraph_fastapi_endpoint` for Python agents, then connect via `HttpAgent` from the TypeScript runtime.

**Python agent (FastAPI + LangGraph):**

```python
# main.py
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from copilotkit import LangGraphAGUIAgent
from fastapi import FastAPI
from langgraph.graph import END, START, MessagesState, StateGraph
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
import uvicorn

async def chat_node(state: MessagesState):
    model = ChatOpenAI(model="gpt-4o")
    system_message = SystemMessage(content="You are a helpful assistant.")
    response = await model.ainvoke([system_message, *state["messages"]])
    return {"messages": response}

graph = StateGraph(MessagesState)
graph.add_node(chat_node)
graph.add_edge(START, "chat_node")
graph.add_edge("chat_node", END)
graph = graph.compile()

app = FastAPI()
add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="sample_agent",
        description="A helpful AI assistant",
        graph=graph,
    ),
    path="/",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8123, reload=True)
```

**TypeScript runtime connecting to the Python agent:**

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime"
import { HttpAgent } from "@ag-ui/client"
import { NextRequest } from "next/server"

const runtime = new CopilotRuntime({
  agents: {
    sample_agent: new HttpAgent({ url: "http://localhost:8123/" }),
  },
})

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  })
  return handleRequest(req)
}
```

Reference: [AG-UI Integration](https://docs.copilotkit.ai/guides/ag-ui)

## 3. Middleware

**Impact: MEDIUM**

Middleware hooks for request/response processing. Used for auth, logging, context injection, and response modification.

### 3.1 Use beforeRequest for Auth and Logging

**Impact: MEDIUM (centralizes cross-cutting concerns before agent execution)**

Use the `beforeRequest` middleware hook to handle authentication, logging, and context injection before the agent processes a request.

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

### 3.2 Use afterRequest for Response Modification

**Impact: LOW (enables response logging and cleanup without modifying agents)**

Use the `afterRequest` middleware hook for logging completed requests, tracking usage metrics, or cleaning up resources.

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

### 3.3 Handle Middleware Errors Gracefully

**Impact: MEDIUM (unhandled middleware errors crash the runtime for all users)**

Wrap middleware logic in try/catch to prevent individual request failures from crashing the entire runtime.

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

## 4. Security

**Impact: HIGH**

Security patterns for production CopilotKit deployments. Unprotected endpoints expose your LLM and agent capabilities to abuse.

### 4.1 Authenticate Before Agent Execution

**Impact: CRITICAL (unauthenticated endpoints expose LLM capabilities to anyone)**

Always authenticate requests before they reach the agent.

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

### 4.2 Configure CORS for Specific Origins

**Impact: HIGH (wildcard CORS exposes your LLM endpoint to any website)**

Never use wildcard (`*`) CORS in production. Specify the exact frontend origin(s).

**Correct (specific origin in production):**

```typescript
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [process.env.FRONTEND_URL!]
  : ["http://localhost:3000", "http://localhost:5173"]

app.use(cors({ origin: allowedOrigins }))
```

Reference: [Security](https://docs.copilotkit.ai/guides/security)

### 4.3 Rate Limit by User or API Key

**Impact: HIGH (unbounded access lets single users exhaust LLM budget)**

Add rate limiting by authenticated user ID or API key, not just IP address.

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

## 5. Performance

**Impact: MEDIUM**

Optimization patterns for runtime performance, streaming, and resource management.

### 5.1 Prevent Proxy Buffering of Streams

**Impact: MEDIUM (buffered streams cause long delays before first token appears)**

CopilotKit uses Server-Sent Events (SSE) for streaming. Set headers to disable reverse proxy buffering.

**Correct (disable proxy buffering for streaming):**

```typescript
app.use("/api/copilotkit", (req, res, next) => {
  res.setHeader("X-Accel-Buffering", "no")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Content-Type", "text/event-stream")
  next()
}, createCopilotEndpointExpress({ runtime }))
```

For Nginx, also add to your server config:
```
proxy_buffering off;
```

Reference: [Deployment](https://docs.copilotkit.ai/guides/self-hosting)

---

## References

- https://docs.copilotkit.ai
- https://github.com/CopilotKit/CopilotKit
- https://docs.copilotkit.ai/reference/runtime
