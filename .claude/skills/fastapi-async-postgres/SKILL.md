---
name: fastapi-async-postgres
description: Sets up asynchronous PostgreSQL with SQLAlchemy for FastAPI applications. Use when creating new projects that need async database access, adding PostgreSQL to existing applications, or when the user asks about async database patterns, asyncpg, or SQLAlchemy async sessions.
---

# Async PostgreSQL with SQLAlchemy

## Dependencies

```bash
pip install sqlalchemy asyncpg
```

## Setup Workflow

Copy this checklist and track progress:

```
Setup Progress:
- [ ] Step 1: Create database configuration
- [ ] Step 2: Create models
- [ ] Step 3: Integrate with FastAPI lifespan
- [ ] Step 4: Verify connection
```

### Step 1: Create Database Configuration

Copy `assets/database.py` to the project (typically `app/database.py`).

Customize:
- `DATABASE_URL`: Update with actual connection credentials
- `metadata`: Adjust schema name or remove if not using schemas
- `echo`: Set to `False` in production

### Step 2: Create Models

Copy `assets/models.py` and replace `ExampleModel` with actual models.

### Step 3: Integrate with FastAPI

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, init_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(lifespan=lifespan)

@app.get("/items")
async def get_items(db: AsyncSession = Depends(get_db)):
    # Use db session here
    pass
```

### Step 4: Verify Setup

Run the application and hit an endpoint that uses the database.

## Resources

- `assets/database.py` - Async database configuration template
- `assets/models.py` - Example model with SQLAlchemy 2.0 patterns
- `references/async_postgres_guide.md` - Query patterns, best practices, common mistakes
