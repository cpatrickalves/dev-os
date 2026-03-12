---
title: Prevent Proxy Buffering of Streams
impact: MEDIUM
impactDescription: buffered streams cause long delays before first token appears
tags: perf, streaming, proxy, buffering
---

## Prevent Proxy Buffering of Streams

CopilotKit uses Server-Sent Events (SSE) for streaming. Reverse proxies (Nginx, Cloudflare) may buffer the response, causing long delays before the first token reaches the client. Set headers to disable buffering.

**Incorrect (no streaming headers, proxy buffers response):**

```typescript
app.use("/api/copilotkit", createCopilotEndpointExpress({ runtime }))
```

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
