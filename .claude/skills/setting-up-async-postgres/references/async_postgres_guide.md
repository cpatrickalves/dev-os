# Async PostgreSQL Reference Guide

## Contents
- Route implementation patterns
- SQLAlchemy 2.0 query patterns (select, insert, update, delete)
- Application lifecycle
- Common mistakes
- Best practices checklist

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

### Select

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

## Application Lifecycle

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()   # Startup
    yield
    await close_db()  # Shutdown

app = FastAPI(lifespan=lifespan)
```

## Common Mistakes

1. **Using synchronous drivers** - Always use `asyncpg`, not `psycopg2`
2. **Creating global session instances** - Use dependency injection instead
3. **Not closing connections** - Use async context managers
4. **Mixing ORM and raw SQL inconsistently** - Pick one approach per operation
5. **Embedding queries directly in routes** - Consider a repository pattern for complex apps

## Best Practices Checklist

- [ ] Use `postgresql+asyncpg://` connection string
- [ ] Set `expire_on_commit=False` on session factory
- [ ] Use dependency injection for sessions (`Depends(get_db)`)
- [ ] Initialize database in lifespan event
- [ ] Dispose engine in lifespan shutdown
- [ ] Use SQLAlchemy 2.0 style queries (`select()` not `query()`)
- [ ] Disable `echo=True` in production
