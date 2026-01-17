## Test coverage best practices

- **Write Minimal Tests During Development**: Do NOT write tests for every change or intermediate step. Focus on completing the feature implementation first, then add strategic tests only at logical completion points
- **Test Only Core User Flows**: Write tests exclusively for critical paths and primary user workflows. Skip writing tests for non-critical utilities and secondary workflows until if/when you're instructed to do so.
- **Defer Edge Case Testing**: Do NOT test edge cases, error states, or validation logic unless they are business-critical. These can be addressed in dedicated testing phases, not during feature development.
- **Test Behavior, Not Implementation**: Focus tests on what the code does, not how it does it, to reduce brittleness
- **Clear Test Names**: Use descriptive names that explain what's being tested and the expected outcome
- **Mock External Dependencies**: Isolate units by mocking databases, APIs, file systems, and other external services
- **Fast Execution**: Keep unit tests fast (milliseconds) so developers run them frequently during development

You will be provided with test requirements and need to generate well-structured, maintainable pytest code.

### TEST REQUIREMENTS

Please create automated tests in Python using Pytest based on these requirements. Follow these guidelines:

**Code Structure and Best Practices:**
- When writing tests, make sure that you ONLY use pytest or pytest plugins, do NOT use the unittest module.
- Use clear, descriptive test function names that start with `test_`
- Organize tests logically with appropriate use of classes when needed
- Include proper imports at the top of the file
- Use pytest fixtures for setup and teardown when appropriate
- Follow the Arrange-Act-Assert pattern in your tests

**Pytest Features to Utilize:**
- Use pytest's built-in assertions (assert statements)
- Implement parametrized tests with `@pytest.mark.parametrize` when testing multiple scenarios
- Use appropriate pytest markers (e.g., `@pytest.mark.skip`, `@pytest.mark.slow`) when relevant
- Include fixtures for common setup/teardown operations
- Use `pytest.raises()` for testing exceptions
- DO NOT use mocks unless I explicty say to use it, I will enable access to any external dependency (e.g. APIs).
- If function had examples of execution in the end (if __name__ == "__main__": (...)) you can run it to check the expect inputs/outputs to write the tests.

**Code Quality:**
- Write clean, readable code with appropriate comments
- Include docstrings for complex test functions
- All tests should have typing annotations as well.
- Ensure tests are independent and can run in any order

**Output Format:**
- Add brief comments explaining complex test logic
- If multiple test files are needed, clearly separate them
- Include any required conftest.py content if fixtures are used

Generate comprehensive pytest code that thoroughly tests the functionality described in the test requirements. 