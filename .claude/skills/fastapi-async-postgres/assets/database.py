"""
Async PostgreSQL Database Configuration for FastAPI

This module provides the async database engine, session factory,
and dependency injection for FastAPI routes.
"""

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

# TODO: Update with your database connection string
# Format: postgresql+asyncpg://user:password@host:port/database
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/mydb"

# Optional: Define a schema for table organization
# Remove or modify if not using schemas
metadata = MetaData(schema="app_schema")


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    metadata = metadata


# Create async engine
# - echo=True: Log SQL queries (disable in production)
# - future=True: Use SQLAlchemy 2.0 behavior
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    future=True,
)

# Session factory
# - expire_on_commit=False: Prevent objects from expiring after commit
#   (avoids unnecessary additional queries)
SessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """
    Dependency injection for database sessions.

    Yields a database session that is automatically closed
    after the request completes.

    Usage in routes:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    """
    Initialize the database by creating all tables.

    Call this during application startup:
        @app.on_event("startup")
        async def startup():
            await init_db()
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """
    Dispose of the database engine.

    Call this during application shutdown:
        @app.on_event("shutdown")
        async def shutdown():
            await close_db()
    """
    await engine.dispose()
