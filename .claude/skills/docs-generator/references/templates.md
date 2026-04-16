# Document Templates

Starting-point templates for each document in the standard. Adapt to the project's reality — remove sections that don't apply, add sections that are needed. Templates are in English as a neutral baseline; translate to the project's language when generating.

---

## README.md

The README is the project's storefront — substantial enough to be useful on its own, short enough to read end-to-end. Drop sections that genuinely don't apply (e.g., "Notes & Constraints" if there are none; "License" for internal projects). Section names below are in English; when generating for a PT-BR project, translate them: Overview→Visão Geral, Features→Funcionalidades, Project Structure→Estrutura do Projeto, Prerequisites→Pré-requisitos, Tech Stack→Stack principal, Installation→Instalação, Usage→Como usar, Notes & Constraints→Observações e Restrições, Documentation→Documentação, Maintainers→Responsáveis, License→Licença.

```markdown
# {project-name}

{Optional one-line tagline — what it does in 10 words or less.}

## Overview

{1-3 paragraphs. Explain what the project is, what problem it solves, who it's for, and the operational context if relevant — e.g., "runs as a daily cron job on Prefect", "deployed via docker compose to internal infrastructure", "consumed by the X frontend". Concrete is better than abstract.}

## Features

* **{Feature name}**: {one-line description of what it does}
* **{Feature name}**: {one-line description}
* **{Feature name}**: {one-line description}

## Project Structure

\```bash
{Run `tree -L 2 -I '*.pyc|__pycache__|node_modules|.git'` and paste the output, then add brief inline comments per important file/dir.}

├── Dockerfile               # Container build
├── pyproject.toml           # Dependencies and project metadata
├── src/                     # Application code
│   ├── api/                 # HTTP route handlers
│   └── services/            # Business logic
└── tests/                   # Test suite
\```

## Prerequisites

- `{runtime}` `{version}+` — {why it's needed, if not obvious}
- `{tool}`: {what it's for}
- {Access requirements: VPN, credentials, accounts}

## Tech Stack

* `{framework}`: {one-line role in the project — e.g., "HTTP server"}
* `{framework}`: {one-line role}
* `{framework}`: {one-line role}

## Installation

1. Clone the repository:
   \```bash
   git clone {repo-url}
   cd {project-name}
   \```

2. Configure environment variables — copy `.env.example` to `.env` and fill the required values:
   \```bash
   cp .env.example .env
   \```

3. Install dependencies:
   \```bash
   {install-command}     # e.g., uv sync / poetry install / npm install
   \```

### Usage

\```bash
{run-command}            # e.g., docker compose up -d / make dev / poetry run python ...
\```

The application will be available at `http://localhost:{port}`.

## Notes & Constraints

{Optional. Include only if there are real operational restrictions or non-obvious behaviors.}

* {Constraint — e.g., "Only runs on weekdays."}
* {Constraint — e.g., "Requires VPN access to the internal network."}

## Documentation

For deeper detail, see the [docs/](docs/) folder:

- [Getting Started](docs/getting-started.md) — Full local setup
- [Architecture](docs/architecture.md) — System overview and key decisions
- [Contributing](CONTRIBUTING.md) — How to contribute *(Standard tier only)*
- [ADRs](docs/adr/) — Architecture decisions *(Standard tier only)*

## Maintainers

- **{Name}** — {email or contact channel}
- **{Name}** — {email or contact channel}

## License

{license-type}. See [LICENSE](LICENSE) for details.
```

---

## AGENTS.md

```markdown
# {project-name}

{one-line description}. Built with {primary-stack}.

## Language

{Documentation language directive — e.g., "All docs and comments in PT-BR."}

## Commands

\```bash
{dev-command}         # Start development server
{test-command}        # Run tests
{lint-command}        # Lint code
{format-command}      # Format code
{build-command}       # Build for production
{typecheck-command}   # Type checking (if applicable)
\```

## Structure

\```
{directory-tree-of-key-folders-only}
\```

## Conventions

- {convention-1: e.g., "All API routes in src/routes/, one file per resource"}
- {convention-2: e.g., "Use Pydantic models for all request/response shapes"}
- {convention-3: e.g., "Tests mirror source structure under tests/"}

## Gotchas

- {gotcha-1: e.g., "Database migrations must be run manually: `alembic upgrade head`"}
- {gotcha-2: e.g., "The .env file is required — copy .env.example first"}

## Key docs

- [Architecture](docs/architecture.md)
- [API Reference](docs/reference/api.md)
- [Environment Variables](docs/reference/environment-variables.md)
```

---

## docs/getting-started.md

Tutorial only — local setup and first run. Operational content (logs, rollback, escalation) belongs in `docs/guides/deployment.md`.

```markdown
# Getting Started

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| {runtime} | {version}+ | {install-link-or-command} |
| {tool} | {version}+ | {install-link-or-command} |

## Setup

1. Clone the repository:
   \```bash
   git clone {repo-url}
   cd {project-name}
   \```

2. Install dependencies:
   \```bash
   {install-command}
   \```

3. Configure environment:
   \```bash
   cp .env.example .env
   # Edit .env with your local settings
   \```

4. {Database/service setup if needed}:
   \```bash
   {setup-command}
   \```

5. Start the development server:
   \```bash
   {dev-command}
   \```

## Verify It Works

\```bash
{health-check-command-or-url}
\```

Expected response: {expected}

## Running Tests

\```bash
{test-command}
\```

## Common Issues

**{Problem 1}**
{Cause and solution}

**{Problem 2}**
{Cause and solution}
```

---

## docs/architecture.md

```markdown
# Architecture

## Overview

{1-2 paragraphs describing what the system does and how it's organized at a high level}

## System Diagram

\```mermaid
graph TB
    subgraph "{system-boundary}"
        A[{Component A}] --> B[{Component B}]
        B --> C[{Component C}]
    end
    D[{External Service}] --> A
    C --> E[(Database)]
\```

## Components

**{Component A}** — {one-line responsibility}
{2-3 sentences on what it does, key technologies, entry points}

**{Component B}** — {one-line responsibility}
{2-3 sentences}

**{Component C}** — {one-line responsibility}
{2-3 sentences}

## Data Flow

{Describe the primary data flow through the system for the most common use case. Use numbered steps.}

1. {Step 1}
2. {Step 2}
3. {Step 3}

## External Dependencies

| Service | Purpose | Documentation |
|---------|---------|---------------|
| {service} | {why it's used} | {link} |

## Key Decisions

{For Essential tier (no separate ADR files), capture the major choices inline as 5-10 bullets:}

- **{Decision}** — {1-line rationale}. *e.g., "Picked SQLite over Postgres because the data fits in memory and we don't need concurrent writes."*
- **{Decision}** — {1-line rationale}.

{For Standard tier, replace the bullets with a link:}

Major architecture decisions are documented as ADRs in [docs/adr/](adr/).
```

---

## docs/adr/template.md

Follows MADR 4.0 (Markdown Any Decision Records). Status and date live in YAML front matter; option list comes before the decision; pros/cons and confirmation are optional but useful.

```markdown
---
status: {proposed | accepted | deprecated | superseded by ADR-NNNN}
date: {YYYY-MM-DD}
decision-makers: {names or roles, optional}
---

# ADR-{NNNN}: {Title}

## Context and Problem Statement

{What is the problem or situation that requires a decision? What forces / constraints / pain point prompted this? Keep it 2-4 sentences.}

## Considered Options

- {Option 1}
- {Option 2}
- {Option 3}

## Decision Outcome

Chosen option: **{Option N}**, because {brief justification — the main driver}.

### Pros and Cons of the Options

#### {Option 1}
- Good, because {argument}
- Bad, because {argument}

#### {Option 2}
- Good, because {argument}
- Bad, because {argument}

## Consequences

**Positive:**
- {consequence}

**Negative:**
- {consequence}

**Neutral:**
- {consequence}

## Confirmation (optional)

{How will we know this decision is working? Fitness function, ArchUnit test, code review checklist, lint rule, etc.}
```

---

## CONTRIBUTING.md

```markdown
# Contributing

## Development Workflow

1. Create a branch from `{default-branch}`:
   \```bash
   git checkout -b {branch-prefix}/{description}
   \```

2. Make your changes and commit:
   \```bash
   {commit-command-or-convention}
   \```

3. Push and open a Pull Request:
   \```bash
   git push origin {branch-prefix}/{description}
   \```

## Code Style

Code formatting and linting are automated:

\```bash
{format-command}   # Format code
{lint-command}     # Check for issues
\```

{If pre-commit hooks exist: "Pre-commit hooks run these automatically."}

## Commit Messages

{Convention — e.g., Conventional Commits: `type(scope): description`}

Examples:
- `feat(auth): add JWT token refresh`
- `fix(api): handle empty response from external service`
- `docs: update getting-started guide`

## Testing

All changes must include tests. Run the test suite before submitting:

\```bash
{test-command}
\```

## Code Review

- PRs require {N} approval(s) before merge
- {Any specific review guidelines}
```

---

## docs/guides/deployment.md

For typical Docker-based projects this single file covers deploy + operate. Drop the Escalation section if there is no on-call rotation.

```markdown
# Deployment

## Environments

| Environment | URL | Branch |
|-------------|-----|--------|
| {env-name} | {url} | {branch} |

## Deploy Process

\```bash
{deploy-command-or-steps}     # e.g., docker compose up -d --build
\```

## Pre-deploy Checklist

- [ ] Tests passing
- [ ] {check}
- [ ] {check}

## Logs

\```bash
{log-access-command}          # e.g., docker compose logs -f {service}
\```

Patterns worth watching:
- `{pattern}` — indicates {meaning}

## Rollback

\```bash
{rollback-command}            # e.g., git checkout {prev-tag} && docker compose up -d --build
\```

## Escalation (only if the project has on-call)

| Level | Contact | When to page |
|-------|---------|--------------|
| L1 | {team/person} | {criteria — e.g., "user-facing errors > 1%"} |
| L2 | {team/person} | {criteria — e.g., "data loss or outage > 15 min"} |

For incident playbooks (symptoms → cause → resolution), see [Troubleshooting](troubleshooting.md).
```

---

## docs/guides/configuration.md

```markdown
# Configuration

## Configuration Sources

{Describe the configuration hierarchy — env vars, config files, CLI flags, defaults. Which takes precedence?}

## Environment-Specific Settings

See [Environment Variables](../reference/environment-variables.md) for the complete reference of all configurable values.

### Development
{Key differences from production — debug flags, mock services, local URLs}

### Production
{Key production-specific settings — logging levels, connection pools, timeouts}
```

---

## docs/guides/troubleshooting.md

```markdown
# Troubleshooting

## {Problem Category}

**{Symptom}**
Cause: {explanation}
Fix: {solution}

**{Symptom}**
Cause: {explanation}
Fix: {solution}
```

---

## docs/reference/api.md

Two modes — pick the one that matches the project:

**Mode 1 — Stub (preferred when the project serves auto-generated API docs).** Keep this file under 15 lines. Manually-written endpoint shapes rot the moment a route changes.

```markdown
# API Reference

Base URL: `{base-url}`

Interactive API documentation:
- Swagger UI: `{base-url}/docs`
- ReDoc: `{base-url}/redoc`
- OpenAPI schema: `{base-url}/openapi.json`

## Authentication

{Auth scheme — Bearer token, API key, session — anything not obvious from the schema.}

## Notes

- {Rate limits, deprecation policy, versioning rule — anything the generated docs don't cover.}
```

**Mode 2 — Full reference (when the project does NOT serve auto-generated docs — e.g., libraries with public interfaces, REST APIs without OpenAPI).**

```markdown
# API Reference

Base URL: `{base-url}`

## Authentication

{Auth mechanism — Bearer token, API key, session, etc.}

## Endpoints

### {Resource}

#### `{METHOD} {path}`
{Brief description}

**Request:**
\```json
{request-body-example}
\```

**Response:** `{status-code}`
\```json
{response-body-example}
\```
```

---

## docs/reference/environment-variables.md

```markdown
# Environment Variables

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `{VAR_NAME}` | {description} | `{example-value}` |

## Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `{VAR_NAME}` | `{default}` | {description} |
```

