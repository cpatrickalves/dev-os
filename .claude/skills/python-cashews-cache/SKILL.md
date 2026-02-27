---
name: cashews-cache
description: "Adds caching to Python functions using the cashews library with disk cache (diskcache) as default backend. Use when the user asks to add cache, optimize with caching, or configure cashews. Triggers on 'add cache', 'cache this function', 'setup cashews', 'add disk cache', or 'optimize with cache'."
---

# Cashews Cache

Add async-native caching to Python functions using [cashews](https://github.com/Krukov/cashews) with diskcache as the default backend.

## Workflow

Copy this checklist when adding cache to a function:

```
Cache Implementation Progress:
- [ ] Read source function — understand inputs, outputs, and dependencies
- [ ] Verify function is pure (no side-effects like DB writes, emails, etc.)
- [ ] Verify function is async (cashews is async-first; sync functions need wrapping)
- [ ] Choose the right decorator (see Decision Tree below)
- [ ] Design cache key — include ALL inputs that affect output
- [ ] Set appropriate TTL based on data freshness requirements
- [ ] Verify cache setup exists in app startup (see Setup section)
- [ ] Add invalidation strategy if data can change externally
- [ ] Test cache hit/miss behavior
```

## Installation

```bash
uv add "cashews[diskcache]"
```

For Redis support: `uv add "cashews[redis]"`

## Setup

Configure cache once at application startup. **Always call `cache.setup()` before any cached function is invoked.**

```python
from cashews import cache

# Disk cache (default — persistent, no external service needed)
cache.setup("disk:///tmp/my-app-cache")

# In-memory (development/testing — fast but volatile)
cache.setup("mem://")

# Redis (production distributed — shared across processes)
cache.setup("redis://localhost:6379")
```

### FastAPI Integration

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from cashews import cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    cache.setup("disk:///tmp/my-app-cache")
    yield
    await cache.close()

app = FastAPI(lifespan=lifespan)
```

### Environment-Based Configuration

```python
import os
from cashews import cache

CACHE_URL = os.getenv("CACHE_URL", "disk:///tmp/my-app-cache")
cache.setup(CACHE_URL)
```

## Decorator Decision Tree

```
Need to cache a function result?
│
├─► Basic caching with TTL?
│   └─► @cache(ttl="1h")
│
├─► Hot data that must never be stale?
│   └─► @cache.early(ttl="1h", early_ttl="50m")
│       (refreshes in background before expiry)
│
├─► OK to serve stale while refreshing?
│   └─► @cache.soft(ttl="1h", soft_ttl="30m")
│       (returns old value, recalculates in background)
│
├─► Many concurrent calls to same function?
│   └─► @cache.locked(ttl="1h")
│       (prevents cache stampede — only one call executes)
│
├─► Calling an unreliable external API?
│   └─► @cache.failover(ttl="1h")
│       (returns cached value if function raises exception)
│
└─► Caching async iterators/generators?
    └─► @cache.iterator(ttl="1h")
```

## Basic Usage

### Simple Cache with TTL

```python
from cashews import cache

@cache(ttl="1h")
async def get_user(user_id: int) -> dict:
    return await db.fetch_user(user_id)
```

### Custom Cache Key

Encode ALL inputs that affect the output in the key:

```python
@cache(ttl="2h", key="user:{user_id}:posts:{page}")
async def get_user_posts(user_id: int, page: int = 1) -> list:
    return await api.fetch_posts(user_id, page)
```

### Class Methods

```python
class UserService:
    def __init__(self, host: str):
        self._host = host

    @cache(ttl="1h", key="{self._host}:user:{user_id}")
    async def get_user(self, user_id: int) -> dict:
        return await self._fetch(user_id)
```

### Failover for External APIs

```python
@cache.failover(ttl="6h")
async def fetch_external_data(query: str) -> dict:
    # If API fails, returns last cached successful response
    response = await httpx_client.get(f"/api/search?q={query}")
    response.raise_for_status()
    return response.json()
```

### Early Refresh for Hot Data

```python
@cache.early(ttl="1h", early_ttl="50m")
async def get_dashboard_stats() -> dict:
    # After 50min, next request triggers background refresh
    # All requests continue getting cached value until refresh completes
    return await compute_expensive_stats()
```

## TTL Formats

```python
@cache(ttl="30s")          # 30 seconds
@cache(ttl="5m")           # 5 minutes
@cache(ttl="2h")           # 2 hours
@cache(ttl="1d")           # 1 day
@cache(ttl="2h5m30s")      # Combined: 2h 5min 30sec
@cache(ttl=timedelta(hours=1))  # timedelta object
```

## Cache Invalidation

### Tag-Based (Recommended)

```python
@cache(ttl="1h", tags=["users", "user:{user_id}"])
async def get_user(user_id: int) -> dict:
    return await db.fetch_user(user_id)

# Invalidate all user caches
await cache.delete_tags("users")

# Invalidate specific user
await cache.delete_tags("user:123")
```

### Manual Key Deletion

```python
# Delete specific cached result
await cache.delete("user:123:posts:1")
```

### Disable Cache at Runtime

```python
# Skip cache reads (force fresh data)
async with cache.disabling("get"):
    result = await get_user(123)

# Skip all cache operations
async with cache.disabling("get", "set"):
    result = await get_user(123)
```

## Anti-Patterns

1. **Caching functions with side-effects** — only cache pure functions (read-only)
2. **Missing inputs in cache key** — all parameters that affect output MUST be in the key, especially `user_id` or auth context (security bug)
3. **No TTL or maxsize** — cache grows unbounded, leading to disk/memory exhaustion
4. **Caching without measuring** — verify hit rates before assuming performance gain
5. **Caching too aggressively** — only cache what is genuinely expensive to compute or fetch

## Resources

For advanced patterns (middleware, monitoring, transactions, backend comparison, LLM caching), see `references/advanced-patterns.md`.

For cache invalidation strategies in depth, see `references/invalidation-guide.md`.
