# Advanced Cashews Patterns

## All Decorators — Complete Reference

### @cache — Basic TTL Cache

```python
from cashews import cache

@cache(ttl="1h", key="items:{category}:{page}")
async def get_items(category: str, page: int = 1) -> list:
    return await db.query_items(category, page)
```

Parameters:
- `ttl` — Time-to-live (string like `"1h"`, `"30m"`, or `timedelta`)
- `key` — Key template with `{param_name}` substitution. If omitted, auto-generated from function name + args
- `tags` — List of tags for group invalidation
- `condition` — Callable that determines whether to cache the result

### @cache.early — Background Refresh Before Expiry

```python
@cache.early(ttl="1h", early_ttl="50m")
async def get_stats() -> dict:
    return await compute_stats()
```

After `early_ttl` (50min), the next request triggers a background refresh while still returning the cached value. Ensures data is always fresh without blocking requests.

**Use for**: Dashboard data, frequently accessed aggregations, config values.

### @cache.soft — Serve Stale While Refreshing

```python
@cache.soft(ttl="1h", soft_ttl="30m")
async def get_recommendations(user_id: int) -> list:
    return await ml_model.predict(user_id)
```

Between `soft_ttl` (30min) and `ttl` (1h), returns the stale cached value immediately and recalculates in background. After `ttl`, the cache entry is fully expired.

**Use for**: ML predictions, expensive computations where slightly stale data is acceptable.

### @cache.locked — Stampede Prevention

```python
@cache.locked(ttl="1h")
async def compute_report(report_id: str) -> dict:
    return await heavy_computation(report_id)
```

When multiple concurrent requests hit the same uncached key, only ONE executes the function. Others wait for the result. Prevents "thundering herd" / cache stampede.

**Use for**: Expensive computations called concurrently, popular endpoints after cache expiry.

### @cache.failover — Circuit Breaker Pattern

```python
@cache.failover(ttl="6h")
async def fetch_exchange_rates() -> dict:
    response = await httpx_client.get("https://api.exchange.com/rates")
    response.raise_for_status()
    return response.json()
```

If the function raises an exception, returns the last successfully cached value. Gracefully degrades when external services are down.

**Use for**: External API calls, third-party integrations, unreliable services.

### @cache.iterator — Async Iterator Cache

```python
@cache.iterator(ttl="30m")
async def stream_events(channel: str):
    async for event in event_source.subscribe(channel):
        yield event
```

Caches results from async generators/iterators.

### Combining Decorators

Decorators can be stacked for combined behavior:

```python
@cache.failover(ttl="6h")
@cache.locked(ttl="1h")
async def fetch_critical_data(key: str) -> dict:
    # Locked: prevents stampede
    # Failover: returns stale data if function fails
    return await external_api.get(key)
```

## Backend Configuration

### Disk Cache (Default)

```python
cache.setup("disk:///tmp/my-app-cache")

# Custom directory
cache.setup("disk:///var/cache/my-app")
```

Properties:
- Persistent across restarts (SQLite-backed)
- Thread-safe and process-safe
- No external service required
- Good for: single-instance apps, LLM response caching, API response caching

### Memory Cache

```python
cache.setup("mem://")
```

Properties:
- Fastest access, volatile (lost on restart)
- Good for: development, testing, ephemeral data

### Redis

```python
# Basic
cache.setup("redis://localhost:6379")

# With authentication
cache.setup("redis://:password@host:6379/0")

# With connection pool
cache.setup(
    "redis://localhost:6379",
    minsize=1,
    maxsize=100,
    socket_connect_timeout=5,
    retry_on_timeout=True,
)

# With SSL
cache.setup(
    "redis://host:6380",
    ssl=True,
    ssl_certfile="/path/to/cert.pem",
)
```

Properties:
- Shared across multiple processes/instances
- Good for: distributed systems, horizontal scaling

### Client-Side Cache (Redis optimization)

```python
cache.setup("redis://localhost:6379", client_side=True)
```

Maintains a local in-memory copy synced with Redis. ~10x faster reads. Redis notifies when keys change.

## Backend Comparison

| Feature | Memory | Disk | Redis |
|---------|--------|------|-------|
| Persistence | No | Yes | Optional |
| Shared across processes | No | Partial | Yes |
| Speed | Fastest | Fast | Fast |
| External dependency | None | None | Redis server |
| Scalability | Single process | Single machine | Distributed |
| Best for | Dev/test | Single instance | Multi-instance |

## Custom Middleware

### Error Handling Middleware

```python
from cashews.middlewares import BaseMiddleware
from loguru import logger

class ErrorHandlingMiddleware(BaseMiddleware):
    async def set(self, key, value, **kwargs):
        try:
            return await super().set(key, value, **kwargs)
        except Exception as e:
            logger.error(f"Cache set failed for key={key}: {e}")
            return None

    async def get(self, key, **kwargs):
        try:
            return await super().get(key, **kwargs)
        except Exception as e:
            logger.error(f"Cache get failed for key={key}: {e}")
            return None

cache.add_middleware(ErrorHandlingMiddleware())
```

### Logging Middleware

```python
class LoggingMiddleware(BaseMiddleware):
    async def get(self, key, **kwargs):
        result = await super().get(key, **kwargs)
        if result is not None:
            logger.debug(f"Cache HIT: {key}")
        else:
            logger.debug(f"Cache MISS: {key}")
        return result

cache.add_middleware(LoggingMiddleware())
```

## Prometheus Monitoring

```python
from cashews.middlewares.prometheus import create_metrics_middleware

middleware = create_metrics_middleware()
cache.add_middleware(middleware)
```

Exposes metrics: cache hits, misses, latency, errors.

## Conditional Caching

Cache only when the result meets a condition:

```python
@cache(ttl="1h", condition=lambda result: result is not None)
async def search(query: str) -> dict | None:
    result = await api.search(query)
    return result  # None results are NOT cached
```

```python
# Cache only successful HTTP responses
@cache(ttl="2h", condition=lambda r: r.get("status") == "ok")
async def fetch_data(endpoint: str) -> dict:
    return await api.get(endpoint)
```

## Runtime Cache Control

### Disable Operations

```python
# Skip cache reads (always compute fresh)
async with cache.disabling("get"):
    fresh_result = await get_data(key)

# Skip all cache operations
async with cache.disabling("get", "set"):
    result = await get_data(key)
```

### Respect HTTP Cache-Control Headers

```python
from fastapi import Request

async def get_data_endpoint(request: Request, key: str):
    if request.headers.get("Cache-Control") == "no-cache":
        async with cache.disabling("get"):
            return await get_data(key)
    return await get_data(key)
```

## Caching LLM/API Responses

For large text responses (LLM completions, API payloads), disk cache with compression is ideal:

```python
cache.setup("disk:///tmp/llm-cache")

@cache(ttl="24h", key="llm:{model}:{hash(prompt)}")
async def call_llm(model: str, prompt: str) -> str:
    response = await openai_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content
```

Benefits:
- LLM calls are expensive ($) and slow — caching saves both
- Disk cache persists across restarts
- Identical prompts return instantly from cache

## Transactions

```python
async with cache.transact(isolation="READ_COMMITTED"):
    await cache.set("key1", "value1")
    await cache.set("key2", "value2")
    # Both commit together or fail together
```

## Dynamic TTL Based on Parameters

```python
def compute_ttl(user_type: str) -> str:
    return "4h" if user_type == "premium" else "30m"

@cache(ttl=compute_ttl)
async def get_user_feed(user_type: str) -> list:
    return await build_feed(user_type)
```
