# Test Writing Standards

## Test Philosophy

- **Minimal Tests During Development**: Complete feature implementation first, then add strategic tests at logical completion points. Do NOT write tests for every change or intermediate step.
- **Focus on Core User Flows**: Write tests exclusively for critical paths and primary user workflows. Skip non-critical utilities and secondary workflows unless instructed otherwise.
- **Defer Edge Cases**: Do NOT test edge cases, error states, or validation logic unless business-critical. Address these in dedicated testing phases.
- **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it, to reduce brittleness.

## Code Structure

- Use pytest or pytest plugins only. Do NOT use the unittest module.
- Name test functions descriptively starting with `test_`, explaining what's being tested and expected outcome.
- Organize tests logically with classes when needed.
- Follow the Arrange-Act-Assert pattern.
- Include proper imports at the top of the file.
- Tests must be independent and runnable in any order.
- Keep tests fast (milliseconds) so they run frequently during development.

## Pytest Features

- Use pytest's built-in `assert` statements.
- Use `@pytest.mark.parametrize` when testing multiple scenarios.
- Use `pytest.raises()` for testing exceptions.
- Use fixtures for common setup/teardown operations.
- Use markers (e.g., `@pytest.mark.skip`, `@pytest.mark.slow`) when relevant.
- Do NOT use mocks unless explicitly instructed. External dependencies will be enabled as needed.
- Reference `if __name__ == "__main__"` examples in source files to understand expected inputs/outputs.

## Code Quality

- Include typing annotations on all tests.
- Add brief comments only for complex test logic.
- Include docstrings for complex test functions.
- Separate multiple test files clearly.
- Include `conftest.py` content when fixtures are shared.
