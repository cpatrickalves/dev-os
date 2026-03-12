---
name: copilotkit-runtime-patterns
description: Server-side runtime patterns for CopilotKit. Use when setting up CopilotKit runtime endpoints (Express, Hono, Next.js), configuring agent runners, adding middleware, or securing the runtime. Triggers on backend tasks involving @copilotkit/runtime, @copilotkitnext/runtime, CopilotRuntime, agent registration, AG-UI protocol, or API endpoint configuration.
license: MIT
metadata:
  author: copilotkit
  version: "2.0.0"
---

# CopilotKit Runtime Patterns

Server-side runtime configuration patterns. Contains 15 rules across 5 categories.

## When to Apply

Reference these guidelines when:
- Setting up CopilotKit runtime endpoints (Express, Hono, Next.js API routes)
- Registering agents (`LangGraphAgent`, `LangGraphHttpAgent`, `HttpAgent`)
- Connecting Python agents via AG-UI protocol
- Adding middleware for logging, auth, or request modification
- Securing the runtime (CORS, auth, rate limiting)
- Optimizing runtime performance

## Key API Changes (v2.0)

- `CopilotRuntime` replaces `CopilotKitRuntime`
- Functional endpoint helpers (`copilotRuntimeNextJSAppRouterEndpoint`, `createCopilotEndpointExpress`, `createCopilotEndpointHono`) replace class methods
- Agents registered as dictionary `{ name: instance }` instead of array
- `LangGraphAgent`, `LangGraphHttpAgent`, `HttpAgent` replace `BuiltInAgent`
- `ExperimentalEmptyAdapter` used as `serviceAdapter` when agents handle LLM calls
- AG-UI protocol for Python/FastAPI agent integration

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Endpoint Setup | CRITICAL | `endpoint-` |
| 2 | Agent Runners | HIGH | `runner-` |
| 3 | Middleware | MEDIUM | `middleware-` |
| 4 | Security | HIGH | `security-` |
| 5 | Performance | MEDIUM | `perf-` |

## Quick Reference

### 1. Endpoint Setup (CRITICAL)

- `endpoint-express-setup` - Configure Express endpoint with `createCopilotEndpointExpress`
- `endpoint-hono-setup` - Configure Hono endpoint with `createCopilotEndpointHono`
- `endpoint-nextjs-route` - Set up Next.js route with `copilotRuntimeNextJSAppRouterEndpoint`

### 2. Agent Runners (HIGH)

- `runner-agent-registration` - Register agents as named dictionary entries with typed classes
- `runner-multiple-agents` - Configure multi-agent routing with unique dictionary keys
- `runner-inmemory-vs-sqlite` - Python agent via AG-UI protocol (FastAPI + LangGraph)

### 3. Middleware (MEDIUM)

- `middleware-before-request` - Use beforeRequest for auth, logging, context injection
- `middleware-after-request` - Use afterRequest for response modification and cleanup
- `middleware-error-handling` - Handle errors in middleware without crashing the runtime

### 4. Security (HIGH)

- `security-cors-config` - Configure CORS for your specific frontend origin
- `security-auth-middleware` - Authenticate requests before agent execution
- `security-rate-limiting` - Rate limit by user or API key

### 5. Performance (MEDIUM)

- `perf-streaming-response` - Ensure streaming is not buffered by proxies
- `perf-agent-timeout` - Set agent execution timeouts
- `perf-connection-pooling` - Pool database connections for persistent storage

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
