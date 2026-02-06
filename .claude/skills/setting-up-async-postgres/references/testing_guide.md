# Database Testing Guide

## Contents
- Test database fixtures (conftest.py)
- Writing async database tests
- Common testing pitfalls

## Test Database Fixtures

### tests/conftest.py

```python
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.core.database import get_db, Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with session_factory() as session:
        yield session

@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
```

### Key Patterns

- **In-memory SQLite**: Use `sqlite+aiosqlite:///:memory:` for fast, isolated tests with no cleanup needed
- **Dependency override**: Replace `get_db` with test session via `app.dependency_overrides`
- **Table creation per fixture**: `Base.metadata.create_all` in fixture ensures clean schema each run
- **Requires**: `pip install aiosqlite pytest-asyncio httpx`

## Common Testing Pitfalls

1. **Forgetting to install `aiosqlite`** - Tests fail with "no module named aiosqlite"
2. **Not overriding `get_db`** - Tests hit the real database instead of in-memory SQLite
3. **Using `pytest.fixture` without `async def`** - Async fixtures need `async def` with `pytest-asyncio`
4. **Missing `pytest-asyncio`** - Required for `@pytest.mark.asyncio` and async fixtures
5. **Not resetting `dependency_overrides`** - Can leak between tests; the fixture-scoped override above handles this automatically
