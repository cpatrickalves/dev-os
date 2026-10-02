# Async PostgreSQL Reference Guide

## Contents
- Route implementation patterns
- SQLAlchemy 2.0 query patterns (select, insert, update, delete)
- Relationship patterns
- Alembic migrations
- Error handling patterns
- Common mistakes
- Best practices checklist

## Route Implementation

```python
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.session import get_db
from app.database.models import ExampleModel

DbSession = Annotated[AsyncSession, Depends(get_db)]

@app.get("/examples")
async def get_examples(db: DbSession):
    result = await db.execute(select(ExampleModel))
    return result.scalars().all()

@app.post("/examples")
async def create_example(name: str, db: DbSession):
    example = ExampleModel(name=name)
    db.add(example)
    await db.flush()
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
await db.flush()
await db.refresh(item)  # Get generated values (id, timestamps)
```

### Update

```python
item.name = "new name"
await db.flush()
```

### Delete

```python
await db.delete(item)
await db.flush()
```

## Relationship Patterns

```python
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

class Author(Base):
    __tablename__ = "authors"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    books: Mapped[list["Book"]] = relationship(
        back_populates="author", cascade="all, delete-orphan"
    )

class Book(Base):
    __tablename__ = "books"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"))
    author: Mapped["Author"] = relationship(back_populates="books")
```

> **Cascade options**: `"all, delete-orphan"` auto-deletes children when parent is deleted or child is removed from collection. Other common values: `"save-update, merge"` (default — propagate adds only), `"delete"` (delete children with parent, but keep orphans).

Async eager loading (avoids lazy-load issues):

```python
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(Author).options(selectinload(Author.books))
)
authors = result.scalars().all()
# authors[0].books is already loaded — no lazy-load error
```

> **Other loading strategies**: Use `joinedload()` for one-to-one or many-to-one (single JOIN). Use `subqueryload()` as an alternative to `selectinload` for very large collections. All are imported from `sqlalchemy.orm`.

## Alembic Migrations

Initialize async Alembic:

```bash
pip install alembic
alembic init -t async migrations
```

Configure `migrations/env.py`:

```python
from app.database.session import Base, DATABASE_URL

config.set_main_option("sqlalchemy.url", DATABASE_URL)
target_metadata = Base.metadata
```

Common commands:

```bash
alembic revision --autogenerate -m "add users table"
alembic upgrade head
alembic downgrade -1
```

> Once Alembic manages your schema, remove `create_all` from `init_db()` — Alembic owns the schema lifecycle.

## Error Handling Patterns

```python
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

# Duplicate / constraint violation → 409
async def create_item(data: ItemCreate, db: DbSession):
    item = Item(**data.model_dump())
    db.add(item)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Item already exists")
    await db.refresh(item)
    return item

# Not found → 404
async def get_item(item_id: int, db: DbSession):
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
```

## Common Mistakes

1. **Using synchronous drivers** - Always use `asyncpg`, not `psycopg2`
2. **Creating global session instances** - Use dependency injection instead
3. **Not closing connections** - Use async context managers
4. **Mixing ORM and raw SQL inconsistently** - Pick one approach per operation
5. **Embedding queries directly in routes** - Consider a repository pattern for complex apps
6. **Missing `AsyncAttrs` mixin on Base** - Required for async lazy-load access of relationships; use `class Base(AsyncAttrs, DeclarativeBase)`
7. **Manual commit in routes** - The `get_db()` dependency auto-commits on success and rolls back on error; use `flush()` instead of `commit()` in route/repository code
8. **Using `declarative_base()`** - Deprecated; use `class Base(AsyncAttrs, DeclarativeBase)` instead
9. **Using `Column(Type)`** - Deprecated; use `Mapped[type] = mapped_column()` instead
10. **Using `sessionmaker` for async** - Use `async_sessionmaker` instead

## Best Practices Checklist

- [ ] Use `postgresql+asyncpg://` connection string
- [ ] Set `expire_on_commit=False` on session factory
- [ ] Use `Annotated[AsyncSession, Depends(get_db)]` for session injection
- [ ] Include `AsyncAttrs` mixin on Base class
- [ ] Initialize database in lifespan event
- [ ] Dispose engine in lifespan shutdown
- [ ] Use SQLAlchemy 2.0 style queries (`select()` not `query()`)
- [ ] Use `flush()` instead of `commit()` in routes (auto-commit in `get_db`)
- [ ] Disable `echo=True` in production
- [ ] Use in-memory SQLite (`aiosqlite`) for test fixtures
- [ ] Override `get_db` dependency in test client fixtures
