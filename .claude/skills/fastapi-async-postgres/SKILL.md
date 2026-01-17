---
name: fastapi-async-postgres
description: This skill should be used when setting up asynchronous PostgreSQL with SQLAlchemy. Use it when creating new projects that need async database access, adding PostgreSQL to existing applications, or when the user asks about async database patterns.
---

# Async PostgreSQL with SQLAlchemy

## Overview

This skill provides the correct pattern for setting up asynchronous PostgreSQL with SQLAlchemy. It ensures non-blocking database operations for scalable APIs. The examples are based on FastAPI, but the patterns can be applied to any Python application.

## Quick Start

### Required Dependencies

```bash
pip install sqlalchemy asyncpg
```

### Workflow Decision

1. **New FastAPI project** → Copy templates from `assets/` and customize
2. **Existing FastAPI project** → Adapt templates to existing structure

## Setup Steps

### Step 1: Create Database Configuration

Copy `assets/database.py` to the project's database module location (typically `app/database.py` or `src/database.py`).

Customize:
- `DATABASE_URL`: Update with actual connection credentials
- `metadata`: Adjust schema name or remove if not using schemas
- `echo`: Set to `False` in production

### Step 2: Create Models

Copy `assets/models.py` and replace `ExampleModel` with actual models.

Key patterns:
- Inherit all models from `Base`
- Use SQLAlchemy 2.0 `Mapped` type annotations
- Include timestamp fields for audit trails

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

Test the connection by running the application and hitting an endpoint that uses the database.

## Resources

### assets/

- `database.py` - Complete async database configuration template
- `models.py` - Example model demonstrating SQLAlchemy 2.0 patterns

### references/

- `async_postgres_guide.md` - Detailed reference with query patterns, best practices, and common mistakes to avoid

For advanced patterns (complex queries, relationships, transactions), consult `references/async_postgres_guide.md`.
