You will be creating or updating a Makefile for a software project. A Makefile should contain important and frequently used commands that help developers work more efficiently with the project.

Main is information about the project is available in the file README.md and CLAUDE.md files.

Your task is to create or update a Makefile that includes commonly needed developer commands. A good Makefile should:

- Include a default `.PHONY` declaration for targets that don't create files
- Have a `help` target (ideally as the default) that lists all available commands with descriptions
- Include common development tasks such as:
  - Installation/setup commands (e.g., installing dependencies)
  - Build commands
  - Test commands (unit tests, integration tests, etc.)
  - Linting and formatting commands
  - Running the application (development mode, production mode)
  - Cleaning build artifacts
  - Database operations (if applicable)
  - Docker operations (if applicable)
- Use clear, descriptive target names
- Include comments explaining what each target does
- Follow Makefile best practices (proper use of variables, dependencies between targets, etc.)

Before writing the Makefile:

1. Identify the project type and technology stack
2. Determine what commands would be most useful for developers
3. Note any existing targets that should be preserved or updated
4. Plan the structure and organization of the Makefile