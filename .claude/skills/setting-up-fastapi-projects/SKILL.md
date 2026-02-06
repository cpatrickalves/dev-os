---
name: setting-up-fastapi-projects
description: Creates production-ready FastAPI projects with async SQLAlchemy, dependency injection, and layered architecture. Use when building new FastAPI applications, setting up backend API projects, implementing async REST APIs, or creating microservices with Python.
---

# FastAPI Project Templates

## Project Setup Workflow

Copy this checklist and track progress:

```
Project Setup:
- [ ] Step 1: Scaffold project structure
- [ ] Step 2: Configure settings and database
- [ ] Step 3: Define models and schemas
- [ ] Step 4: Implement repository layer
- [ ] Step 5: Implement service layer
- [ ] Step 6: Create API endpoints
- [ ] Step 7: Add authentication (if needed)
- [ ] Step 8: Set up tests
- [ ] Step 9: Verify with `uvicorn app.main:app --reload`
```

## Project Structure

```
app/
├── api/
│   ├── v1/
│   │   ├── endpoints/     # Route handlers
│   │   └── router.py      # Router aggregation
│   └── dependencies.py    # Shared dependencies (auth, etc.)
├── core/
│   ├── config.py          # Pydantic Settings + .env
│   └── security.py        # JWT + password hashing
├── database/              # All DB modules here (see setting-up-async-postgres skill)
│   ├── session.py         # Async engine, session factory, get_db, init_db, close_db
│   └── models.py          # SQLAlchemy ORM models
├── schemas/               # Pydantic request/response schemas
├── services/              # Business logic
├── repositories/          # Data access (generic CRUD base)
└── main.py                # App entry with lifespan
```

> **Database modules belong in `app/database/`, not `app/core/`.** The `setting-up-async-postgres` skill owns all database configuration. This skill focuses on the FastAPI layers above the database.

## Architecture Rules

1. **Layered architecture**: Routes → Services → Repositories → DB. Never skip layers.
2. **Async all the way**: Use `async def` for routes, DB operations, and external calls. Never mix sync DB drivers with async handlers.
3. **Dependency injection**: Use `Annotated[Type, Depends()]` for DB sessions, auth, and shared logic.
4. **Pydantic schemas**: Separate `Create`, `Update`, and `Read` schemas. Never expose ORM models directly.

## Key Dependencies

```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]      # See setting-up-async-postgres skill for database setup
asyncpg                  # PostgreSQL async driver
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
httpx                    # For async test client
pytest-asyncio
```

## Quick Reference

### Settings Pattern

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    model_config = SettingsConfigDict(env_file=".env")

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

### Database Configuration

Use the `setting-up-async-postgres` skill for all database setup (engine, sessions, models, migrations, testing). It provides everything needed in `app/database/`.

Imports used by other layers in this project:
```python
from app.database.session import get_db, init_db, close_db  # Session/lifecycle
from app.database.session import Base, AsyncSessionLocal     # Rarely needed directly
from app.database.models import User                         # ORM models
```

### Lifespan Pattern

```python
from contextlib import asynccontextmanager
from app.database.session import init_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(title="API", version="1.0.0", lifespan=lifespan)
```

## Detailed Implementation Patterns

For complete code examples of each layer, see [references/implementation-patterns.md](references/implementation-patterns.md):

- **Application setup** — main.py, config
- **CRUD Repository** — Generic base with get/create/update/delete
- **Service layer** — Business logic with password hashing, validation
- **API endpoints** — RESTful routes with dependency injection
- **Authentication** — JWT tokens, OAuth2 bearer, current_user dependency
- **Testing** — pytest fixtures (database test fixtures via `setting-up-async-postgres` skill)

## Common Pitfalls

- Database configuration pitfalls (deprecated patterns, async setup) — see the `setting-up-async-postgres` skill
- Using `.dict()` on Pydantic models — deprecated; use `.model_dump()` instead
- Using `datetime.utcnow()` — deprecated; use `datetime.now(timezone.utc)` instead
- Using `= Depends(dep)` — prefer `Annotated[Type, Depends(dep)]` for reusable dependencies
- Using inner `class Config` in BaseSettings — use `model_config = SettingsConfigDict(...)` instead
- Blocking calls in async handlers — use `run_in_executor()` or async libraries
- Business logic in route handlers — extract to service layer
- Direct DB access in routes — go through repository layer
