"""
Async PostgreSQL Database Configuration for FastAPI
"""

from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData
from sqlalchemy.exc import OperationalError

# TODO: Update with your database connection string
# Format: postgresql+asyncpg://user:password@host:port/database
# For production, use pydantic-settings with a .env file instead of hardcoding
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"

# Optional: Define a schema for table organization
# Remove or modify if not using schemas
metadata = MetaData(schema="app_schema")


class Base(AsyncAttrs, DeclarativeBase):
    metadata = metadata


engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production
    pool_pre_ping=True,  # Verify connections before use
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """Dependency injection for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Initialize database tables. Call during app startup.

    Remove create_all once Alembic manages your schema migrations.
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except OperationalError as e:
        raise RuntimeError(
            f"Failed to connect to database. Verify DATABASE_URL and that "
            f"PostgreSQL is running: {e}"
        ) from e


async def close_db() -> None:
    """Dispose of the database engine. Call during app shutdown."""
    await engine.dispose()
