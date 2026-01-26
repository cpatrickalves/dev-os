---
name: fastapi-api-key-auth
description: This skill should be used when adding API key authentication to FastAPI applications. Use it when the user wants to secure endpoints with API keys, implement X-API-Key header validation, or protect routes with simple token-based authentication. Triggers on requests like "add API key auth", "secure my endpoints", or "protect my FastAPI routes".
---

# FastAPI API Key Authentication

## Overview

Implement header-based API key authentication for FastAPI applications using the `APIKeyHeader` security scheme and FastAPI's dependency injection system. API keys are stored in environment variables for simple, secure configuration.

## Implementation

### Step 1: Configure Environment Variables

Create or update `.env` file with API keys:

```env
API_KEYS=key1,key2,key3
```

For a single key:

```env
API_KEY=your-secret-api-key
```

### Step 2: Create the Authentication Dependency

Create `app/auth.py` (or add to existing auth module):

```python
import os
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

# Initialize the API key header scheme
api_key_header = APIKeyHeader(
    name="X-API-Key",
    description="API key for authentication",
    auto_error=True,
)


def get_api_keys() -> set[str]:
    """Load valid API keys from environment."""
    keys = os.getenv("API_KEYS", "")
    if keys:
        return {k.strip() for k in keys.split(",") if k.strip()}
    # Fallback to single key
    single_key = os.getenv("API_KEY", "")
    return {single_key} if single_key else set()


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """Dependency that validates the API key from X-API-Key header."""
    valid_keys = get_api_keys()
    if not valid_keys:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key authentication not configured",
        )
    if api_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    return api_key
```

### Step 3: Apply to Routes

**Option A: Protect specific routes**

```python
from fastapi import Depends
from app.auth import verify_api_key

@app.get("/protected")
async def protected_route(api_key: str = Depends(verify_api_key)):
    return {"message": "Access granted"}
```

**Option B: Protect all routes in a router**

```python
from fastapi import APIRouter, Depends
from app.auth import verify_api_key

router = APIRouter(
    prefix="/api",
    dependencies=[Depends(verify_api_key)],
)

@router.get("/data")
async def get_data():
    return {"data": "protected"}
```

**Option C: Protect entire application**

```python
from fastapi import Depends, FastAPI
from app.auth import verify_api_key

app = FastAPI(dependencies=[Depends(verify_api_key)])
```

### Step 4: Update OpenAPI Documentation

The `APIKeyHeader` scheme automatically adds API key authentication to the OpenAPI docs. To customize the security scheme name displayed in Swagger UI:

```python
api_key_header = APIKeyHeader(
    name="X-API-Key",
    scheme_name="API Key Authentication",
    description="Enter your API key in the X-API-Key header",
    auto_error=True,
)
```

## Usage

Clients authenticate by including the API key in the request header:

```bash
curl -H "X-API-Key: your-api-key" https://api.example.com/protected
```

## Security Considerations

- Store API keys in environment variables, never in code
- Use `.env` files locally and secure secret management in production
- Add `.env` to `.gitignore` to prevent accidental commits
- Consider using different API keys for different environments
- For production systems requiring key rotation, user association, or rate limiting, consider upgrading to database-backed key storage
