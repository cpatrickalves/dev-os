---
name: pytest-testing
description: This skill should be used when creating automated tests in Python using pytest. Use it when the user asks to write tests, generate test cases, add test coverage, or create unit/integration tests for Python code. Triggers on requests like "write tests for this function", "add pytest tests", "create unit tests", or "test this module".
---

# Pytest Testing

## Overview

Generate well-structured, maintainable pytest code for Python projects. This skill focuses on unit tests and integration tests following best practices including the Arrange-Act-Assert pattern, proper fixtures, parametrization, and comprehensive mocking strategies.

## Test Requirements

### Code Structure and Best Practices

- Use **only pytest or pytest plugins** - never use the unittest module for test structure
- Use clear, descriptive test function names starting with `test_`
- Organize tests logically with appropriate use of classes when needed
- Include proper imports at the top of the file
- Use pytest fixtures for setup and teardown when appropriate
- Follow the **Arrange-Act-Assert** pattern in all tests

### Pytest Features to Utilize

- Use pytest's built-in assertions (`assert` statements)
- Implement parametrized tests with `@pytest.mark.parametrize` for multiple scenarios
- Use appropriate pytest markers (`@pytest.mark.skip`, `@pytest.mark.slow`) when relevant
- Include fixtures for common setup/teardown operations
- Use `pytest.raises()` for testing exceptions
- If a function or module has execution examples at the end (e.g., `if __name__ == "__main__":`) run it to check expected inputs/outputs and create better tests and mocks
- Include any required `conftest.py` content if fixtures are used

### Code Quality

- Write clean, readable code with appropriate comments
- Include docstrings for complex test functions
- All tests must have **typing annotations**
- Ensure tests are independent and can run in any order

## Async Testing with pytest-asyncio

For async code, use **pytest-asyncio** plugin. Configure in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"  # Recommended: auto-detects async tests
asyncio_default_fixture_loop_scope = "function"
```

### Asyncio Modes

| Mode | Description | When to Use |
|------|-------------|-------------|
| `auto` | Auto-detects async tests, no markers needed | **Recommended** for asyncio-only projects |
| `strict` | Requires explicit `@pytest.mark.asyncio` | Multi-async library projects (asyncio + trio) |

### Basic Async Test (auto mode)

```python
# No marker needed with asyncio_mode = "auto"
async def test_fetch_data() -> None:
    result = await fetch_data()
    assert result == "expected_value"
```

### Async Test (strict mode)

```python
import pytest

@pytest.mark.asyncio
async def test_fetch_data() -> None:
    result = await fetch_data()
    assert result == "expected_value"
```

### Async Fixtures with pytest_asyncio

```python
import pytest_asyncio

@pytest_asyncio.fixture
async def db_connection():
    """Async fixture for database connection."""
    conn = await create_connection()
    yield conn
    await conn.close()

async def test_query(db_connection) -> None:
    result = await db_connection.execute("SELECT 1")
    assert result is not None
```

### Event Loop Scopes

Control event loop lifecycle for performance optimization:

```python
import pytest

# Module-level: all tests share one event loop
pytestmark = pytest.mark.asyncio(loop_scope="module")

async def test_first() -> None:
    # Runs in shared module loop
    pass

async def test_second() -> None:
    # Same loop as test_first
    pass
```

```python
# Class-level scope
@pytest.mark.asyncio(loop_scope="class")
class TestAsyncOperations:
    async def test_one(self) -> None:
        pass

    async def test_two(self) -> None:
        # Same loop as test_one
        pass
```

### Fixture Loop Scope Control

```python
import pytest_asyncio

# Fixture runs in session loop, cached per module
@pytest_asyncio.fixture(loop_scope="session", scope="module")
async def expensive_resource():
    resource = await create_expensive_resource()
    yield resource
    await resource.cleanup()

# Fixture runs in module loop, fresh for each function
@pytest_asyncio.fixture(loop_scope="module")
async def per_test_resource():
    return await setup_resource()
```

### Mocking Async Functions

```python
async def test_async_api_call(mocker) -> None:
    # Use AsyncMock for async functions
    mock_fetch = mocker.patch(
        "myapp.client.fetch",
        new_callable=mocker.AsyncMock
    )
    mock_fetch.return_value = {"data": "value"}

    result = await process_data()

    mock_fetch.assert_awaited_once()
    assert result["data"] == "value"

async def test_async_exception(mocker) -> None:
    mock_api = mocker.patch(
        "myapp.api.request",
        new_callable=mocker.AsyncMock
    )
    mock_api.side_effect = TimeoutError("Connection timeout")

    with pytest.raises(TimeoutError):
        await make_request()
```

### Parametrized Async Tests

```python
import pytest

@pytest.mark.parametrize("url,expected_status", [
    ("http://example.com", 200),
    ("http://example.org", 200),
    ("http://invalid.test", 404),
])
async def test_fetch_urls(url: str, expected_status: int) -> None:
    response = await fetch_url(url)
    assert response.status == expected_status
```

For more async patterns, see `references/mocking_guide.md`.

## Mocking Decision Tree

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
└─► Not sure?
    └─► Use PYTEST-MOCK (most complete)
```

### Monkeypatch - For Simple Substitutions

Use for environment variables, config attributes, and simple patches without call verification:

```python
def test_api_uses_correct_key(monkeypatch) -> None:
    monkeypatch.setenv("API_KEY", "test-123")
    client = APIClient()
    assert client.api_key == "test-123"

def test_debug_mode_active(monkeypatch) -> None:
    monkeypatch.setattr("myapp.config.DEBUG", True)
    response = app.get_error_details()
    assert "stack_trace" in response
```

### pytest-mock (mocker) - For Complete Mocking

Use when verifying calls, simulating returns/exceptions, or mocking async code:

```python
def test_fetches_user_from_api(mocker) -> None:
    mock_get = mocker.patch("requests.get")
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"id": 1, "name": "John"}

    user = fetch_user(1)

    mock_get.assert_called_once_with(
        "https://api.example.com/users/1",
        timeout=30
    )
    assert user.name == "John"

def test_handles_connection_error(mocker) -> None:
    mock_get = mocker.patch("requests.get")
    mock_get.side_effect = ConnectionError("Network failure")

    result = fetch_data_with_retry()

    assert result is None
    assert mock_get.call_count == 3  # 3 retries
```

For detailed mocking patterns, fixtures, and advanced techniques, refer to `references/mocking_guide.md`.

## Test Template

```python
"""Tests for {module_name}."""
from typing import Any
import pytest
from unittest.mock import MagicMock

from myapp.module import function_under_test


class TestFunctionUnderTest:
    """Tests for function_under_test."""

    def test_returns_expected_value_for_valid_input(self) -> None:
        """Verify correct output for standard input."""
        # Arrange
        input_value = "test"
        expected = "expected_result"

        # Act
        result = function_under_test(input_value)

        # Assert
        assert result == expected

    @pytest.mark.parametrize("input_val,expected", [
        ("case1", "result1"),
        ("case2", "result2"),
        ("case3", "result3"),
    ])
    def test_handles_multiple_cases(
        self, input_val: str, expected: str
    ) -> None:
        """Verify correct handling of various input cases."""
        result = function_under_test(input_val)
        assert result == expected

    def test_raises_error_for_invalid_input(self) -> None:
        """Verify appropriate exception for invalid input."""
        with pytest.raises(ValueError, match="Invalid input"):
            function_under_test(None)
```

## Common Patterns

### Fixture for Database Mock

```python
@pytest.fixture
def mock_database(mocker) -> MagicMock:
    """Provide a mocked database connection."""
    mock = mocker.patch("myapp.db.connection")
    mock.return_value.execute.return_value = []
    return mock
```

### Fixture for Environment Setup

```python
@pytest.fixture
def test_env(monkeypatch) -> None:
    """Set up standard test environment."""
    monkeypatch.setenv("ENV", "test")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
```

### Async Database Fixture

```python
import pytest_asyncio

@pytest_asyncio.fixture
async def async_db(mocker) -> AsyncMock:
    """Async database connection mock."""
    mock = mocker.AsyncMock()
    mock.execute.return_value = [{"id": 1}]
    mock.fetch_one.return_value = {"id": 1, "name": "test"}
    return mock
```

## Anti-Patterns to Avoid

1. **Over-mocking** - If everything is mocked, nothing real is tested
2. **Missing call verification** - Always verify mocks were called as expected
3. **Wrong patch location** - Patch where the object is used, not where it's defined
4. **Using unittest module** - Always use pytest-native constructs

## Resources

### references/

Contains `mocking_guide.md` - comprehensive guide to mocking in Python with pytest-mock, monkeypatch, and unittest.mock. Reference this for:
- Detailed API for each mocking approach
- Advanced patterns (datetime mocking, file mocking, context managers)
- Comparison tables between approaches
- Recommended project configuration
