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
    """Initialize database tables. Call during app startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose of the database engine. Call during app shutdown."""
    await engine.dispose()
