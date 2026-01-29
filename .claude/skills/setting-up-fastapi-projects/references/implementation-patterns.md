# FastAPI Implementation Patterns

Detailed code patterns for production FastAPI projects. Read the relevant section based on the task.

## Contents
- Application setup (main.py, config, database)
- SQLAlchemy models (Mapped + mapped_column)
- CRUD Repository pattern
- Service layer
- API endpoints with dependencies
- Authentication and authorization
- Testing setup

## Application Setup

### main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
    await database.disconnect()

app = FastAPI(
    title="API Template",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1.router import api_router
app.include_router(api_router, prefix="/api/v1")
```

### core/config.py

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    API_V1_STR: str = "/api/v1"

    model_config = SettingsConfigDict(env_file=".env")

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

### core/database.py

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=True)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(AsyncAttrs, DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## SQLAlchemy Models (mapped_column style)

### models/user.py

```python
from datetime import datetime, timezone
from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

## CRUD Repository Pattern

### repositories/base_repository.py

```python
from typing import Generic, TypeVar, Type, Optional, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(self, db: AsyncSession, id: int) -> Optional[ModelType]:
        result = await db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalars().first()

    async def get_multi(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> Sequence[ModelType]:
        result = await db.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def create(
        self, db: AsyncSession, obj_in: CreateSchemaType
    ) -> ModelType:
        db_obj = self.model(**obj_in.model_dump())
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        for field, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, field, value)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, id: int) -> bool:
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            return True
        return False
```

### repositories/user_repository.py

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import BaseRepository
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, email: str):
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalars().first()

user_repository = UserRepository(User)
```

## Service Layer

### services/user_service.py

```python
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repository import user_repository
from app.schemas.user import UserCreate, UserUpdate, User
from app.core.security import get_password_hash, verify_password

class UserService:
    def __init__(self):
        self.repository = user_repository

    async def create_user(self, db: AsyncSession, user_in: UserCreate) -> User:
        existing = await self.repository.get_by_email(db, user_in.email)
        if existing:
            raise ValueError("Email already registered")

        user_data = user_in.model_dump()
        user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
        user = await self.repository.create(db, UserCreate(**user_data))
        return user

    async def authenticate(
        self, db: AsyncSession, email: str, password: str
    ) -> Optional[User]:
        user = await self.repository.get_by_email(db, email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

user_service = UserService()
```

## API Endpoints with Dependencies

### api/v1/endpoints/users.py

```python
from typing import Annotated, Sequence
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.user import User, UserCreate, UserUpdate
from app.services.user_service import user_service
from app.api.dependencies import get_current_user

router = APIRouter()

# Reusable annotated dependencies
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate, db: DbSession):
    try:
        return await user_service.create_user(db, user_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=User)
async def read_current_user(current_user: CurrentUser):
    return current_user

@router.get("/{user_id}", response_model=User)
async def read_user(user_id: int, db: DbSession, current_user: CurrentUser):
    user = await user_service.repository.get(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: DbSession, current_user: CurrentUser):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not await user_service.repository.delete(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")
```

## Authentication and Authorization

### core/security.py

```python
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

### api/dependencies.py

```python
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import ALGORITHM
from app.core.config import get_settings
from app.repositories.user_repository import user_repository

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str, Depends(oauth2_scheme)],
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await user_repository.get(db, user_id)
    if user is None:
        raise credentials_exception
    return user
```

## Testing Setup

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

### tests/test_users.py

```python
import pytest

@pytest.mark.asyncio
async def test_create_user(client):
    response = await client.post(
        "/api/v1/users/",
        json={
            "email": "test@example.com",
            "password": "testpass123",
            "name": "Test User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
```
