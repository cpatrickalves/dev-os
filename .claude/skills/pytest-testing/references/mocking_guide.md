# Mocking Guide for Python
## pytest-mock, monkeypatch, and unittest.mock

> **Reference versions:** Python 3.12+ | pytest 8+ | pytest-mock 3.15+

---

## Quick Decision Tree

```
Need to substitute something in a test?
│
├─► Environment variable or simple config?
│   └─► Use MONKEYPATCH
│
├─► Need to verify IF/HOW it was called?
│   └─► Use PYTEST-MOCK (mocker)
│
├─► Complex object with multiple methods?
│   └─► Use PYTEST-MOCK (mocker)
│
├─► Outside pytest (pure unittest)?
│   └─► Use UNITTEST.MOCK directly
│
└─► Not sure?
    └─► Use PYTEST-MOCK (most complete)
```

---

## 1. Monkeypatch - Surgical Substitutions

### When to Use

- Environment variables
- Configuration attributes
- Substitutions where **call verification is not needed**
- Simple and direct patches

### Essential API

```python
# Environment variables
monkeypatch.setenv("API_KEY", "test-key")
monkeypatch.delenv("DEBUG", raising=False)

# Module/class attributes
monkeypatch.setattr(config, "TIMEOUT", 30)
monkeypatch.setattr("myapp.settings.DEBUG", True)

# Dictionaries
monkeypatch.setitem(app.config, "DATABASE_URL", "sqlite:///:memory:")
monkeypatch.delitem(os.environ, "SECRET", raising=False)

# Replace functions (without call verification)
monkeypatch.setattr(requests, "get", lambda *a, **kw: MockResponse())
```

### Practical Examples

```python
# CORRECT: Environment variable
def test_api_uses_correct_key(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-123")

    client = APIClient()
    assert client.api_key == "test-123"


# CORRECT: Simple configuration
def test_debug_mode_active(monkeypatch):
    monkeypatch.setattr("myapp.config.DEBUG", True)

    response = app.get_error_details()
    assert "stack_trace" in response


# CORRECT: Replace simple external dependency
def test_fixed_current_date(monkeypatch):
    from datetime import date

    class FixedDate:
        @classmethod
        def today(cls):
            return date(2025, 1, 28)

    monkeypatch.setattr("myapp.utils.date", FixedDate)
    assert get_formatted_date() == "28/01/2025"


# INCORRECT: When you need to verify calls
def test_sends_email(monkeypatch):
    calls = []
    monkeypatch.setattr(
        "myapp.email.send",
        lambda *a: calls.append(a)  # Workaround!
    )
    # Use mocker.patch() instead
```

---

## 2. pytest-mock (mocker) - Complete Mocking

### When to Use

- Verify **if** a function was called
- Verify **how** it was called (arguments, order)
- Simulate **returns** and **exceptions**
- Objects with **multiple methods**
- **Spy** on real methods
- **Async** mocking

### Installation

```bash
pip install pytest-mock
# or
uv add pytest-mock --dev
```

### Essential API

```python
def test_example(mocker):
    # Basic patch
    mock_func = mocker.patch("myapp.module.function")

    # With defined return
    mock_func.return_value = {"status": "ok"}

    # With side effect (exception, sequential values)
    mock_func.side_effect = ValueError("simulated error")
    mock_func.side_effect = [1, 2, 3]  # Returns sequentially

    # Spy - calls real method but tracks
    spy = mocker.spy(object, "method")

    # Stub - empty object for dependencies
    stub = mocker.stub(name="my_stub")

    # AsyncMock for async functions
    mock_async = mocker.AsyncMock(return_value={"data": []})
```

### Verifications (Assertions)

```python
def test_verifications(mocker):
    mock_send = mocker.patch("myapp.email.send")

    # Execute code
    notify_user("user@test.com", "Hello!")

    # Verify call
    mock_send.assert_called_once()
    mock_send.assert_called_with("user@test.com", "Hello!")
    mock_send.assert_called_once_with("user@test.com", "Hello!")

    # Verify multiple calls
    assert mock_send.call_count == 1

    # Inspect arguments
    args, kwargs = mock_send.call_args
    assert args[0] == "user@test.com"

    # Verify call order
    mock_send.assert_has_calls([
        mocker.call("user1@test.com", "Msg1"),
        mocker.call("user2@test.com", "Msg2"),
    ])

    # Reset for reuse
    mock_send.reset_mock()
```

### Practical Examples

```python
# Mock external HTTP call
def test_fetch_user_api(mocker):
    mock_get = mocker.patch("requests.get")
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {
        "id": 1,
        "name": "John"
    }

    user = fetch_user(1)

    mock_get.assert_called_once_with(
        "https://api.example.com/users/1",
        timeout=30
    )
    assert user.name == "John"


# Simulate exception
def test_handles_connection_error(mocker):
    mock_get = mocker.patch("requests.get")
    mock_get.side_effect = ConnectionError("Network failure")

    result = fetch_data_with_retry()

    assert result is None
    assert mock_get.call_count == 3  # 3 attempts


# Spy - verify call without replacing
def test_cache_avoids_recalculation(mocker):
    calculator = Calculator()
    spy_calculate = mocker.spy(calculator, "expensive_calculation")

    # First call - calculates
    result1 = calculator.get_value(10)
    # Second call - uses cache
    result2 = calculator.get_value(10)

    assert spy_calculate.call_count == 1  # Only calculated once
    assert result1 == result2


# Multiple organized patches
def test_complete_flow(mocker):
    mock_db = mocker.patch("myapp.database.query")
    mock_cache = mocker.patch("myapp.cache.get")
    mock_log = mocker.patch("myapp.logger.info")

    mock_cache.return_value = None  # Cache miss
    mock_db.return_value = [{"id": 1}]

    result = fetch_data("key")

    mock_cache.assert_called_once_with("key")
    mock_db.assert_called_once()
    mock_log.assert_called()  # Log was recorded


# Async mocking
@pytest.mark.asyncio
async def test_async_fetch(mocker):
    mock_fetch = mocker.patch(
        "myapp.client.fetch",
        new_callable=mocker.AsyncMock
    )
    mock_fetch.return_value = {"data": "value"}

    result = await process_data()

    mock_fetch.assert_awaited_once()
    assert result["data"] == "value"


# Autospec - ensures correct interface
def test_with_autospec(mocker):
    # If signature changes, test fails
    mock_service = mocker.patch(
        "myapp.services.EmailService",
        autospec=True
    )

    # This fails if send() doesn't exist or has different signature
    mock_service.return_value.send.return_value = True
```

### Special Scopes

```python
# Class scope - shares mock between methods
class TestUserService:
    def test_create(self, class_mocker):
        mock_db = class_mocker.patch("myapp.db.save")
        # mock_db persists for all test_ in this class

# Module scope
def test_example(module_mocker):
    mock = module_mocker.patch("myapp.config.get")
    # Persists for all tests in module

# Session scope (entire suite)
def test_example(session_mocker):
    mock = session_mocker.patch("myapp.external.api")
    # Persists for entire test session
```

---

## 3. unittest.mock Direct - When Necessary

### When to Use

- Projects that **don't use pytest**
- Tests in **pure unittest**
- Libraries that need **zero extra dependencies**
- Integration with frameworks that require unittest

### Basic Patterns

```python
from unittest.mock import Mock, MagicMock, patch, AsyncMock

# Decorator (most common in unittest)
class TestExample(unittest.TestCase):

    @patch("myapp.module.function")
    def test_with_patch(self, mock_func):
        mock_func.return_value = "value"
        result = code_that_uses_function()
        mock_func.assert_called_once()


# Context manager
def test_with_context_manager():
    with patch("myapp.module.function") as mock_func:
        mock_func.return_value = "value"
        result = code_that_uses_function()
    # Patch is automatically removed here


# Multiple patches (reversed order!)
@patch("myapp.module.func3")
@patch("myapp.module.func2")
@patch("myapp.module.func1")  # Decorators apply bottom to top
def test_multiple(mock1, mock2, mock3):  # Parameters in reverse order!
    pass


# Manual mock
def test_with_manual_mock():
    mock_obj = Mock()
    mock_obj.method.return_value = 42
    mock_obj.configure_mock(attribute="value")

    # MagicMock includes magic methods (__len__, __iter__, etc)
    magic = MagicMock()
    magic.__len__.return_value = 5
    assert len(magic) == 5
```

### Important Syntactic Differences

```python
# unittest.mock with decorators (verbose for multiple patches)
@patch("myapp.c")
@patch("myapp.b")
@patch("myapp.a")
def test_unittest_style(mock_a, mock_b, mock_c):  # Confusing order
    mock_a.return_value = 1
    mock_b.return_value = 2
    mock_c.return_value = 3


# pytest-mock (linear and readable)
def test_pytest_style(mocker):
    mock_a = mocker.patch("myapp.a", return_value=1)
    mock_b = mocker.patch("myapp.b", return_value=2)
    mock_c = mocker.patch("myapp.c", return_value=3)
    # Natural order, no confusion
```

---

## 4. Complete Comparison Table

| Feature | monkeypatch | pytest-mock | unittest.mock |
|---------|-------------|-------------|---------------|
| **Installation** | Native pytest | `pip install pytest-mock` | Native Python |
| **Environment variables** | `setenv()` | Possible, but overkill | `patch.dict(os.environ)` |
| **Simple attributes** | `setattr()` | `patch()` | `patch()` |
| **Verify calls** | No | `assert_called_*` | `assert_called_*` |
| **return_value** | Manual | Native | Native |
| **side_effect** | No | Yes | Yes |
| **Spy (real method)** | No | `mocker.spy()` | Verbose |
| **AsyncMock** | No | Yes | Yes |
| **Autospec** | No | Yes | Yes |
| **Scopes (class/module/session)** | No | Yes | No |
| **Automatic cleanup** | Yes | Yes | Context manager |
| **Error messages** | Basic | Enhanced | Basic |
| **Type hints** | No | `MockerFixture` | Partial |

---

## 5. Patterns and Anti-Patterns

### Best Practices

```python
# 1. Always use autospec when possible
mock_service = mocker.patch("myapp.Service", autospec=True)

# 2. Prefer patch at point of use, not at definition
# WRONG: mocker.patch("requests.get")
# CORRECT: mocker.patch("myapp.api_client.requests.get")

# 3. Combine monkeypatch and mocker when it makes sense
def test_combined(monkeypatch, mocker):
    monkeypatch.setenv("API_URL", "http://test.local")
    mock_get = mocker.patch("myapp.client.requests.get")
    # ...

# 4. Use fixtures for reusable mocks
@pytest.fixture
def mock_database(mocker):
    mock = mocker.patch("myapp.db.connection")
    mock.return_value.execute.return_value = []
    return mock

def test_uses_fixture(mock_database):
    result = fetch_all()
    mock_database.return_value.execute.assert_called()

# 5. Document what is being mocked and why
def test_timeout_handled(mocker):
    """Verify that external API timeout is handled gracefully."""
    mocker.patch(
        "myapp.external_api.fetch",
        side_effect=TimeoutError("Connection timed out")
    )
    # ...
```

### Anti-Patterns

```python
# 1. Over-mocking - test doesn't test anything real
def test_too_much_mock(mocker):
    mocker.patch("myapp.a")
    mocker.patch("myapp.b")
    mocker.patch("myapp.c")
    mocker.patch("myapp.d")
    # If everything is mock, what is being tested?

# 2. Not verifying calls when you should
def test_no_verification(mocker):
    mock_save = mocker.patch("myapp.db.save")
    create_user("John")
    # Forgot: mock_save.assert_called_once()

# 3. Mock in wrong place
def test_wrong_patch(mocker):
    # requests.get is imported in myapp.client
    # This DOESN'T work:
    mocker.patch("requests.get")  # WRONG
    # This works:
    mocker.patch("myapp.client.requests.get")  # CORRECT

# 4. Using mock when integration test would be better
def test_disguised_integration(mocker):
    # If you're mocking 10 things to test one,
    # maybe an integration test is more appropriate

# 5. Ignoring cleanup in pure unittest.mock
def test_leak():
    patcher = patch("myapp.config")
    patcher.start()
    # Forgot patcher.stop() - state leaks!
```

---

## 6. Async Testing with pytest-asyncio

### Configuration

Configure pytest-asyncio in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"  # Recommended for asyncio-only projects
asyncio_default_fixture_loop_scope = "function"
```

| Mode | Behavior |
|------|----------|
| `auto` | Auto-detects async tests, no markers needed |
| `strict` | Requires explicit `@pytest.mark.asyncio` marker |

### Basic Async Test

```python
# With asyncio_mode = "auto" (no marker needed)
async def test_fetch_data():
    result = await fetch_data()
    assert result == "expected"

# With asyncio_mode = "strict" (marker required)
import pytest

@pytest.mark.asyncio
async def test_fetch_data():
    result = await fetch_data()
    assert result == "expected"
```

### Async Fixtures

```python
import pytest_asyncio

@pytest_asyncio.fixture
async def db_connection():
    """Create async database connection."""
    conn = await create_connection()
    yield conn
    await conn.close()

@pytest_asyncio.fixture
async def authenticated_client():
    """Create authenticated HTTP client."""
    client = AsyncClient()
    await client.login("user", "pass")
    yield client
    await client.logout()
```

### Mocking Async Functions

```python
# Basic AsyncMock
async def test_async_api_call(mocker):
    mock_fetch = mocker.patch(
        "myapp.client.fetch",
        new_callable=mocker.AsyncMock
    )
    mock_fetch.return_value = {"data": "value"}

    result = await process_data()

    mock_fetch.assert_awaited_once()
    assert result["data"] == "value"


# AsyncMock with side_effect for exceptions
async def test_async_timeout(mocker):
    mock_request = mocker.patch(
        "myapp.api.request",
        new_callable=mocker.AsyncMock
    )
    mock_request.side_effect = TimeoutError("Connection timeout")

    with pytest.raises(TimeoutError):
        await make_request()


# AsyncMock with sequential returns
async def test_async_retry_logic(mocker):
    mock_fetch = mocker.patch(
        "myapp.client.fetch",
        new_callable=mocker.AsyncMock
    )
    # First two calls fail, third succeeds
    mock_fetch.side_effect = [
        ConnectionError("Failed"),
        ConnectionError("Failed"),
        {"status": "ok"}
    ]

    result = await fetch_with_retry()

    assert result == {"status": "ok"}
    assert mock_fetch.await_count == 3
```

### AsyncMock Assertions

```python
async def test_async_assertions(mocker):
    mock_save = mocker.patch(
        "myapp.db.save",
        new_callable=mocker.AsyncMock
    )

    await save_user({"name": "John"})

    # Verify awaited (not just called)
    mock_save.assert_awaited()
    mock_save.assert_awaited_once()
    mock_save.assert_awaited_with({"name": "John"})
    mock_save.assert_awaited_once_with({"name": "John"})

    # Check await count
    assert mock_save.await_count == 1

    # Check await args
    assert mock_save.await_args == mocker.call({"name": "John"})
```

### Mock Async Context Manager

```python
async def test_async_context_manager(mocker):
    mock_session = mocker.AsyncMock()
    mock_session.__aenter__.return_value = mock_session
    mock_session.__aexit__.return_value = None
    mock_session.execute.return_value = [{"id": 1}]

    mocker.patch("myapp.db.session", return_value=mock_session)

    # async with db.session() as session:
    #     await session.execute(...)
    result = await query_with_session()

    mock_session.execute.assert_awaited()
```

### Mock Async Iterator/Generator

```python
async def test_async_iterator(mocker):
    async def mock_pages():
        for page in [{"items": [1, 2]}, {"items": [3, 4]}]:
            yield page

    mock_fetch = mocker.patch("myapp.api.fetch_pages")
    mock_fetch.return_value = mock_pages()

    items = []
    async for page in fetch_all_pages():
        items.extend(page["items"])

    assert items == [1, 2, 3, 4]
```

### Event Loop Scopes

Control event loop lifecycle for better performance:

```python
import pytest

# Module scope - all tests share one event loop
pytestmark = pytest.mark.asyncio(loop_scope="module")

async def test_first():
    # Runs in shared module loop
    pass

async def test_second():
    # Same event loop as test_first
    pass


# Class scope
@pytest.mark.asyncio(loop_scope="class")
class TestAsyncOperations:
    async def test_one(self):
        pass

    async def test_two(self):
        # Same loop as test_one
        pass
```

### Fixture Loop Scope

```python
import pytest_asyncio

# Session loop, cached per module
@pytest_asyncio.fixture(loop_scope="session", scope="module")
async def expensive_resource():
    resource = await create_expensive_resource()
    yield resource
    await resource.cleanup()

# Module loop, fresh per function
@pytest_asyncio.fixture(loop_scope="module")
async def per_test_resource():
    return await setup_resource()
```

### Testing with httpx/aiohttp

```python
# Mock httpx AsyncClient
async def test_httpx_client(mocker):
    mock_response = mocker.AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": "value"}

    mock_client = mocker.AsyncMock()
    mock_client.get.return_value = mock_response

    mocker.patch("httpx.AsyncClient", return_value=mock_client)
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    result = await fetch_with_httpx("/api/data")

    mock_client.get.assert_awaited_once_with("/api/data")
    assert result == {"data": "value"}


# Mock aiohttp ClientSession
async def test_aiohttp_session(mocker):
    mock_response = mocker.AsyncMock()
    mock_response.status = 200
    mock_response.json = mocker.AsyncMock(return_value={"data": "value"})
    mock_response.__aenter__.return_value = mock_response
    mock_response.__aexit__.return_value = None

    mock_session = mocker.AsyncMock()
    mock_session.get.return_value = mock_response
    mock_session.__aenter__.return_value = mock_session
    mock_session.__aexit__.return_value = None

    mocker.patch("aiohttp.ClientSession", return_value=mock_session)

    result = await fetch_with_aiohttp("/api/data")

    assert result == {"data": "value"}
```

### Parametrized Async Tests

```python
import pytest

@pytest.mark.parametrize("url,expected_status", [
    ("http://example.com", 200),
    ("http://example.org", 200),
    ("http://invalid.test", 404),
])
async def test_fetch_urls(url: str, expected_status: int):
    response = await fetch_url(url)
    assert response.status == expected_status


@pytest.mark.parametrize("input_data,expected", [
    ({"value": 1}, {"result": 2}),
    ({"value": 5}, {"result": 10}),
])
async def test_async_processing(mocker, input_data, expected):
    mock_process = mocker.patch(
        "myapp.processor.process",
        new_callable=mocker.AsyncMock
    )
    mock_process.return_value = expected

    result = await process_async(input_data)

    assert result == expected
```

---

## 7. Ready Recipes

### Mock datetime

```python
from datetime import datetime, date

def test_fixed_date(mocker):
    mock_datetime = mocker.patch("myapp.utils.datetime")
    mock_datetime.now.return_value = datetime(2025, 1, 28, 10, 30)
    mock_datetime.today.return_value = date(2025, 1, 28)

    assert format_current_date() == "28/01/2025 10:30"
```

### Mock file

```python
from unittest.mock import mock_open

def test_file_reading(mocker):
    content = "line1\nline2\nline3"
    mocker.patch("builtins.open", mock_open(read_data=content))

    result = read_file("any.txt")

    assert result == ["line1", "line2", "line3"]
```

### Mock entire class

```python
def test_mock_class(mocker):
    MockService = mocker.patch("myapp.services.ExternalService")

    # Configure instance
    instance = MockService.return_value
    instance.fetch.return_value = {"data": "value"}
    instance.is_connected.return_value = True

    # Code under test creates ExternalService()
    result = process_with_service()

    MockService.assert_called_once()  # Constructor called
    instance.fetch.assert_called()
```

### Mock context manager

```python
def test_mock_context_manager(mocker):
    mock_conn = mocker.MagicMock()
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.__exit__.return_value = False
    mock_conn.execute.return_value = [{"id": 1}]

    mocker.patch("myapp.db.connect", return_value=mock_conn)

    # with db.connect() as conn:
    #     conn.execute(...)
    result = fetch_with_connection()

    mock_conn.execute.assert_called()
```

### Mock generator/iterator

```python
def test_mock_generator(mocker):
    mock_fetch = mocker.patch("myapp.api.fetch_pages")
    mock_fetch.return_value = iter([
        {"page": 1, "items": [1, 2]},
        {"page": 2, "items": [3, 4]},
    ])

    all_items = list(process_all_pages())

    assert all_items == [1, 2, 3, 4]
```

---

## 8. Decision Checklist

Before choosing your mock approach, answer:

- [ ] **Need to verify if something was called?** -> pytest-mock
- [ ] **Need to verify WITH WHAT arguments?** -> pytest-mock
- [ ] **Is it just an environment variable?** -> monkeypatch
- [ ] **Is it just a config attribute?** -> monkeypatch
- [ ] **Need to simulate exception?** -> pytest-mock
- [ ] **Is it async code?** -> pytest-mock (AsyncMock)
- [ ] **Want to ensure interface didn't change?** -> pytest-mock with autospec
- [ ] **Outside pytest?** -> unittest.mock directly
- [ ] **Can you avoid mock completely?** -> Consider integration test

---

## 9. Recommended Configuration

### pyproject.toml

```toml
[project]
dependencies = [
    # ... your dependencies
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-mock>=3.15",
    "pytest-asyncio>=0.24",  # Async testing
    "pytest-cov>=4.0",       # Coverage
]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
python_files = ["test_*.py"]
python_functions = ["test_*"]
addopts = [
    "-v",
    "--strict-markers",
    "--tb=short",
]
```

### Test Structure

```
project/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── services.py
│       └── utils.py
├── tests/
│   ├── conftest.py      # Shared fixtures
│   ├── test_services.py
│   └── test_utils.py
└── pyproject.toml
```

### conftest.py with useful fixtures

```python
import pytest

@pytest.fixture
def mock_env(monkeypatch):
    """Standard test environment."""
    monkeypatch.setenv("ENV", "test")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")

@pytest.fixture
def mock_http(mocker):
    """Default mock for requests."""
    mock = mocker.patch("requests.request")
    mock.return_value.status_code = 200
    mock.return_value.json.return_value = {}
    return mock

@pytest.fixture
def mock_time(mocker):
    """Frozen time for deterministic tests."""
    from datetime import datetime
    frozen = datetime(2025, 1, 28, 12, 0, 0)
    mock_dt = mocker.patch("myapp.utils.datetime")
    mock_dt.now.return_value = frozen
    mock_dt.utcnow.return_value = frozen
    return frozen
```

---

## References

- [pytest-mock documentation](https://pytest-mock.readthedocs.io/)
- [pytest monkeypatch](https://docs.pytest.org/en/stable/how-to/monkeypatch.html)
- [unittest.mock - Python docs](https://docs.python.org/3/library/unittest.mock.html)
