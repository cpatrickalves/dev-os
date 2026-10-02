# Cache Invalidation Guide

## Strategy Decision Tree

```
When should cached data be refreshed?
│
├─► Data changes on a known schedule (e.g., daily report)?
│   └─► TTL-based: set TTL to match schedule
│       @cache(ttl="24h")
│
├─► Data changes when user performs an action (e.g., update profile)?
│   └─► Event-based: invalidate after the action
│       await cache.delete_tags("user:123")
│
├─► Data is related to other cached data (e.g., user → posts)?
│   └─► Tag-based: group related caches with tags
│       @cache(ttl="1h", tags=["user:{user_id}", "posts"])
│
├─► Data changes unpredictably but staleness is OK for a bit?
│   └─► Soft TTL: serve stale while refreshing
│       @cache.soft(ttl="1h", soft_ttl="30m")
│
└─► Data must always be fresh for hot paths?
    └─► Early refresh: proactively recalculate
        @cache.early(ttl="1h", early_ttl="50m")
```

## TTL-Based Invalidation

The simplest strategy. Set a TTL and let entries expire automatically.

```python
# Short TTL for frequently changing data
@cache(ttl="5m")
async def get_active_sessions() -> int:
    return await db.count_active_sessions()

# Long TTL for rarely changing data
@cache(ttl="24h")
async def get_system_config() -> dict:
    return await db.get_config()
```

### Dynamic TTL

Adjust TTL based on function parameters:

```python
def ttl_by_freshness(data_type: str) -> str:
    ttl_map = {
        "realtime": "1m",
        "frequent": "15m",
        "daily": "24h",
        "static": "7d",
    }
    return ttl_map.get(data_type, "1h")

@cache(ttl=ttl_by_freshness)
async def get_data(data_type: str, key: str) -> dict:
    return await fetch_data(data_type, key)
```

## Tag-Based Invalidation (Recommended)

Tags group related cache entries for bulk invalidation. This is the most flexible and recommended approach.

### Tagging Cached Functions

```python
@cache(ttl="2h", tags=["users", "user:{user_id}"])
async def get_user_profile(user_id: int) -> dict:
    return await db.get_user(user_id)

@cache(ttl="1h", tags=["users", "user:{user_id}", "posts"])
async def get_user_posts(user_id: int, page: int = 1) -> list:
    return await db.get_posts(user_id, page)

@cache(ttl="1h", tags=["posts", "post:{post_id}"])
async def get_post(post_id: int) -> dict:
    return await db.get_post(post_id)
```

### Invalidating by Tag

```python
# User updated their profile — invalidate all their caches
async def update_user(user_id: int, data: dict):
    await db.update_user(user_id, data)
    await cache.delete_tags(f"user:{user_id}")
    # Invalidates: get_user_profile(user_id) AND get_user_posts(user_id, *)

# New post created — invalidate post listings
async def create_post(user_id: int, content: str):
    await db.create_post(user_id, content)
    await cache.delete_tags("posts")
    # Invalidates: get_user_posts(*) AND get_post(*)

# Invalidate everything related to users
await cache.delete_tags("users")
```

### Tag Design Principles

1. **Use hierarchical tags**: `"users"` (broad) + `"user:123"` (specific)
2. **Tag by entity**: `"user:{id}"`, `"post:{id}"`, `"org:{id}"`
3. **Tag by category**: `"users"`, `"posts"`, `"config"`
4. **Invalidate at the right level**: specific tag for targeted invalidation, broad tag for bulk

## Event-Based Invalidation

Invalidate cache entries in response to application events (CRUD operations, webhooks, etc.).

### Pattern: Invalidate After Write

```python
class UserService:
    @cache(ttl="2h", tags=["user:{user_id}"])
    async def get_user(self, user_id: int) -> dict:
        return await self.db.get_user(user_id)

    async def update_user(self, user_id: int, data: dict) -> dict:
        result = await self.db.update_user(user_id, data)
        # Invalidate cache after successful write
        await cache.delete_tags(f"user:{user_id}")
        return result

    async def delete_user(self, user_id: int) -> None:
        await self.db.delete_user(user_id)
        await cache.delete_tags(f"user:{user_id}")
```

### Pattern: Invalidate on Webhook

```python
from fastapi import APIRouter

router = APIRouter()

@router.post("/webhooks/data-update")
async def handle_data_update(payload: dict):
    entity_type = payload["type"]
    entity_id = payload["id"]
    await cache.delete_tags(f"{entity_type}:{entity_id}")
    return {"status": "ok"}
```

## Manual Key Deletion

For precise control, delete specific cache keys directly:

```python
# Delete a specific cached result
await cache.delete("user:123:posts:1")

# Check if key exists before deleting
if await cache.exists("user:123:posts:1"):
    await cache.delete("user:123:posts:1")
```

## Full Invalidation (Use Sparingly)

```python
# Clear ALL cache entries — nuclear option
await cache.clear()
```

Only use during deployments or schema migrations, never in regular application flow.

## Combining Strategies

For production systems, combine multiple strategies:

```python
# TTL ensures eventual expiry (safety net)
# Tags enable immediate invalidation on writes
# Early refresh keeps hot data fresh

@cache.early(
    ttl="2h",
    early_ttl="1h45m",
    tags=["dashboard", "org:{org_id}"],
)
async def get_dashboard(org_id: int) -> dict:
    return await compute_dashboard(org_id)

# On data change: immediate invalidation
async def process_new_data(org_id: int, data: dict):
    await save_data(data)
    await cache.delete_tags(f"org:{org_id}")

# TTL provides safety net if event-based invalidation misses
# Early refresh keeps dashboard snappy for frequent visitors
```

## Testing Invalidation

```python
import pytest
from cashews import cache

@pytest.fixture(autouse=True)
async def setup_test_cache():
    cache.setup("mem://")
    yield
    await cache.clear()
    await cache.close()

async def test_cache_invalidated_on_update():
    # First call — cache miss, fetches from source
    result1 = await get_user(123)

    # Update user — should invalidate cache
    await update_user(123, {"name": "New Name"})

    # Second call — should be a cache miss (fresh data)
    result2 = await get_user(123)

    assert result2["name"] == "New Name"
```
