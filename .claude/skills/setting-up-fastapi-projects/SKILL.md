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
│   ├── security.py        # JWT + password hashing
│   └── database.py        # Async engine + session
├── models/                # SQLAlchemy models
├── schemas/               # Pydantic request/response schemas
├── services/              # Business logic
├── repositories/          # Data access (generic CRUD base)
└── main.py                # App entry with lifespan
```

## Architecture Rules

1. **Layered architecture**: Routes → Services → Repositories → DB. Never skip layers.
2. **Async all the way**: Use `async def` for routes, DB operations, and external calls. Never mix sync DB drivers with async handlers.
3. **Dependency injection**: Use `Annotated[Type, Depends()]` for DB sessions, auth, and shared logic.
4. **Pydantic schemas**: Separate `Create`, `Update`, and `Read` schemas. Never expose ORM models directly.
5. **Session management**: Use async context manager in `get_db()` with commit/rollback/close.

## Key Dependencies

```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg              # PostgreSQL async driver
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
httpx                # For async test client
pytest-asyncio
aiosqlite            # For test DB
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

### Async Database Session

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(AsyncAttrs, DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### Lifespan Pattern

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
    await database.disconnect()

app = FastAPI(title="API", version="1.0.0", lifespan=lifespan)
```

## Detailed Implementation Patterns

For complete code examples of each layer, see [references/implementation-patterns.md](references/implementation-patterns.md):

- **Application setup** — main.py, config, database engine
- **SQLAlchemy models** — `Mapped` + `mapped_column` style (SQLAlchemy 2.0)
- **CRUD Repository** — Generic base with get/create/update/delete
- **Service layer** — Business logic with password hashing, validation
- **API endpoints** — RESTful routes with dependency injection
- **Authentication** — JWT tokens, OAuth2 bearer, current_user dependency
- **Testing** — pytest fixtures, async client, in-memory SQLite

## Common Pitfalls

- Using `declarative_base()` — deprecated; use `class Base(AsyncAttrs, DeclarativeBase)` instead
- Using `Column(Type)` — deprecated; use `Mapped[type] = mapped_column()` instead
- Missing `AsyncAttrs` mixin — required on Base for async lazy-load access of relationships
- Using `.dict()` on Pydantic models — deprecated; use `.model_dump()` instead
- Using `datetime.utcnow()` — deprecated; use `datetime.now(timezone.utc)` instead
- Using `sessionmaker` for async — use `async_sessionmaker` instead
- Using `= Depends(dep)` — prefer `Annotated[Type, Depends(dep)]` for reusable dependencies
- Using inner `class Config` in BaseSettings — use `model_config = SettingsConfigDict(...)` instead
- Blocking calls in async handlers — use `run_in_executor()` or async libraries
- Business logic in route handlers — extract to service layer
- Direct DB access in routes — go through repository layer
