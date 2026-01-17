# Async PostgreSQL with SQLAlchemy in FastAPI - Reference Guide

## Why Async Database Access?

Async database access is not an optimization — it's a requirement for scalable APIs. It prevents blocking I/O operations, allowing applications to handle multiple requests concurrently while waiting for database responses.

## Required Dependencies

```bash
pip install sqlalchemy asyncpg
```

- **sqlalchemy**: ORM and database engine
- **asyncpg**: Async PostgreSQL driver (required for async operations)

## Connection String Format

The `+asyncpg` dialect is critical for async driver selection:

```python
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/database"
```

## Key Components

### 1. Async Engine

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    DATABASE_URL,
    echo=True,      # Log SQL queries (disable in production)
    future=True,    # SQLAlchemy 2.0 behavior
)
```

### 2. Session Factory

```python
from sqlalchemy.ext.asyncio import async_sessionmaker

SessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,  # Prevents unnecessary queries after commit
)
```

**Important:** `expire_on_commit=False` prevents objects from expiring after commit, which avoids additional database queries when accessing attributes after a commit.

### 3. Base Class with Schema

```python
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

metadata = MetaData(schema="app_schema")

class Base(DeclarativeBase):
    metadata = metadata
```

Using schemas:
- Organizes tables logically
- Prevents naming conflicts
- Mirrors production environments

### 4. Dependency Injection

```python
async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
```

This pattern ensures:
- One session per request
- Automatic cleanup after use
- Concurrency safety
- Seamless FastAPI integration

## Route Implementation

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import ExampleModel

@app.get("/examples")
async def get_examples(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExampleModel))
    return result.scalars().all()

@app.post("/examples")
async def create_example(name: str, db: AsyncSession = Depends(get_db)):
    example = ExampleModel(name=name)
    db.add(example)
    await db.commit()
    await db.refresh(example)
    return example
```

## SQLAlchemy 2.0 Query Patterns

### Select queries
```python
from sqlalchemy import select

# Get all
result = await db.execute(select(Model))
items = result.scalars().all()

# Get one by ID
result = await db.execute(select(Model).where(Model.id == id))
item = result.scalar_one_or_none()

# Filter with conditions
result = await db.execute(
    select(Model)
    .where(Model.name.contains("search"))
    .order_by(Model.created_at.desc())
    .limit(10)
)
items = result.scalars().all()
```

### Insert
```python
item = Model(name="example")
db.add(item)
await db.commit()
await db.refresh(item)  # Get generated values (id, timestamps)
```

### Update
```python
item.name = "new name"
await db.commit()
```

### Delete
```python
await db.delete(item)
await db.commit()
```

## Application Lifecycle Events

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()

app = FastAPI(lifespan=lifespan)
```

## Common Mistakes to Avoid

1. **Using synchronous drivers** - Always use `asyncpg`, not `psycopg2`
2. **Creating global session instances** - Use dependency injection instead
3. **Not closing connections** - Use async context managers
4. **Mixing ORM and raw SQL inconsistently** - Pick one approach per operation
5. **Embedding queries directly in routes** - Consider a repository pattern for complex apps

## Best Practices Checklist

- [ ] Use `postgresql+asyncpg://` connection string
- [ ] Set `expire_on_commit=False` on session factory
- [ ] Use dependency injection for sessions (`Depends(get_db)`)
- [ ] Initialize database in lifespan/startup event
- [ ] Dispose engine in lifespan/shutdown event
- [ ] Use SQLAlchemy 2.0 style queries (`select()` instead of `query()`)
- [ ] Disable `echo=True` in production
