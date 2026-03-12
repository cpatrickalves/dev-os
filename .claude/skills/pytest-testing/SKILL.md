---
name: pytest-testing
description: This skill generates pytest test suites with fixtures, parametrization, async support, and mocking. This skill should be used when writing tests, adding test coverage, or creating unit/integration tests for Python code. Triggers on "write tests", "add pytest tests", "create unit tests", "test this module", or "add test coverage".
---

# Pytest Testing

To generate well-structured pytest code, follow Arrange-Act-Assert, apply proper fixtures, parametrization, and mocking strategies.

## Workflow

To write tests, copy and follow this checklist:

```markdown
Test Writing Progress:
- [ ] Read the source code to understand inputs, outputs, and edge cases
- [ ] Check for `if __name__ == "__main__":` blocks — run them to understand behavior
- [ ] Identify dependencies to mock (external APIs, databases, file I/O)
- [ ] Choose mocking approach (see Decision Tree below)
- [ ] Write test file with fixtures, parametrized cases, and edge cases
- [ ] Include any needed conftest.py fixtures
- [ ] Verify tests pass
```

## Core Rules

- Only use **pytest and pytest plugins** — never unittest for test structure
- Follow **Arrange-Act-Assert** in all tests
- Annotate all test functions with **return type** (`-> None`)
- Keep tests **independent** and runnable in any order
- Patch where the object is **used**, not where it's **defined**
- Include `conftest.py` content when shared fixtures are needed

## Mocking Decision Tree

To select the appropriate mocking approach:

```text
Need to substitute something?
│
├─► Environment variable or simple config?
│   └─► Use monkeypatch
│
├─► Need to verify calls or arguments?
│   └─► Use pytest-mock (mocker)
│
├─► Async function?
│   └─► Use mocker.AsyncMock
│
└─► Not sure?
    └─► Use pytest-mock (most complete)
```

### monkeypatch — For Environment and Config

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

### pytest-mock (mocker) — Call Verification and Simulation

```python
def test_fetches_user_from_api(mocker) -> None:
    mock_get = mocker.patch("myapp.client.requests.get")
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"id": 1, "name": "John"}

    user = fetch_user(1)

    mock_get.assert_called_once_with(
        "https://api.example.com/users/1", timeout=30
    )
    assert user.name == "John"

def test_handles_connection_error(mocker) -> None:
    mock_get = mocker.patch("myapp.client.requests.get")
    mock_get.side_effect = ConnectionError("Network failure")

    result = fetch_data_with_retry()

    assert result is None
    assert mock_get.call_count == 3
```

## Async Testing with pytest-asyncio

To enable async testing, configure `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
```

Prefer `auto` mode (no markers needed). Reserve `strict` mode for multi-async-library projects.

### Async Fixtures

```python
import pytest_asyncio

@pytest_asyncio.fixture
async def db_connection():
    conn = await create_connection()
    yield conn
    await conn.close()
```

### Mocking Async Functions

```python
async def test_async_api_call(mocker) -> None:
    mock_fetch = mocker.patch(
        "myapp.client.fetch",
        new_callable=mocker.AsyncMock
    )
    mock_fetch.return_value = {"data": "value"}

    result = await process_data()

    mock_fetch.assert_awaited_once()
    assert result["data"] == "value"
```

### Event Loop Scopes

To share event loops across tests for performance, set `loop_scope`:

```python
# Module-level: all tests share one event loop
pytestmark = pytest.mark.asyncio(loop_scope="module")
```

## Common Fixture Patterns

```python
@pytest.fixture
def mock_database(mocker) -> MagicMock:
    mock = mocker.patch("myapp.db.connection")
    mock.return_value.execute.return_value = []
    return mock

@pytest.fixture
def test_env(monkeypatch) -> None:
    monkeypatch.setenv("ENV", "test")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
```

## Parametrization

```python
@pytest.mark.parametrize("input_val,expected", [
    (1, 2),
    (0, 0),
    (-1, -2),
])
def test_double(input_val: int, expected: int) -> None:
    assert double(input_val) == expected


@pytest.mark.parametrize("invalid_input", [None, "", -1, 999])
def test_rejects_invalid(invalid_input) -> None:
    with pytest.raises(ValueError):
        process(invalid_input)
```

## Exception Testing

```python
def test_raises_on_invalid_input() -> None:
    with pytest.raises(ValueError, match="must be positive"):
        process(-1)


def test_raises_custom_exception() -> None:
    with pytest.raises(NotFoundError) as exc_info:
        fetch_user(999)
    assert exc_info.value.status_code == 404
```

## Anti-Patterns to Avoid

1. **Over-mocking** — mocking everything means nothing real is tested
2. **Missing call verification** — verify mocks were called as expected
3. **Wrong patch location** — patch where the object is used, not where defined
4. **Using unittest module** — prefer pytest-native constructs

## Resources

For advanced mocking patterns (datetime, files, classes, context managers, async iterators, httpx/aiohttp, autospec), decision checklists, and recommended project configuration, consult `references/mocking_guide.md`.
