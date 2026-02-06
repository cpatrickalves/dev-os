---
name: setting-up-async-postgres
description: Sets up asynchronous PostgreSQL with SQLAlchemy for FastAPI applications. Use when creating new projects that need async database access, adding PostgreSQL to existing applications, setting up database test fixtures, or when the user asks about async database patterns, asyncpg, SQLAlchemy async sessions, or database testing with aiosqlite.
---

# Async PostgreSQL with SQLAlchemy

## Dependencies

```bash
pip install sqlalchemy asyncpg
pip install aiosqlite  # For async in-memory SQLite test database
```

## Setup Workflow

Copy this checklist and track progress:

```
Setup Progress:
- [ ] Step 1: Create database configuration
- [ ] Step 2: Create models
- [ ] Step 3: Integrate with FastAPI lifespan
- [ ] Step 4: Verify connection
- [ ] Step 5: Set up test database (if testing)
```

### Step 1: Create Database Configuration

Copy `assets/database.py` to the project (typically `app/database.py`).

Customize:
- `DATABASE_URL`: Update with actual connection credentials
- `metadata`: Adjust schema name or remove if not using schemas
- `echo`: Set to `False` in production

> **Pydantic Settings integration**: For production, replace the hardcoded `DATABASE_URL`
> with `pydantic-settings`. Define `DATABASE_URL: str` in a `Settings(BaseSettings)` class
> and load from `.env`. The `assets/database.py` template includes a TODO comment for this.

### Step 2: Create Models

Copy `assets/models.py` and replace `ExampleModel` with actual models.

### Step 3: Integrate with FastAPI

```python
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, init_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(lifespan=lifespan)

DbSession = Annotated[AsyncSession, Depends(get_db)]

@app.get("/items")
async def get_items(db: DbSession):
    # Use db session here
    pass
```

### Step 4: Verify Setup

Run the application and hit an endpoint that uses the database.

### Step 5: Set Up Test Database (Optional)

Create `tests/conftest.py` with async SQLite test fixtures. See
[references/testing_guide.md](references/testing_guide.md) for the complete pattern including:
- In-memory SQLite async engine
- `db_session` fixture with table creation/teardown
- `client` fixture with `dependency_overrides[get_db]`

## Resources

- `assets/database.py` - Async database configuration template
- `assets/models.py` - Example model with SQLAlchemy 2.0 patterns
- `references/async_postgres_guide.md` - Query patterns, relationships, best practices, common mistakes
- `references/testing_guide.md` - Test database fixtures and conftest.py patterns
