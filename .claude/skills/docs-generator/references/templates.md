# Document Templates

Starting-point templates for each document in the standard. Adapt to the project's reality — remove sections that don't apply, add sections that are needed. Templates are in English as a neutral baseline; translate to the project's language when generating.

---

## README.md

```markdown
# {project-name}

{one-line description}

## Tech Stack

{tech stack summary — e.g., "FastAPI · PostgreSQL · React · Docker"}

## Prerequisites

- {runtime} {version}+
- {tool} (for {purpose})
- {optional dependencies}

## Quick Start

\```bash
git clone {repo-url}
cd {project-name}
{setup-command}       # e.g., uv sync / npm install
{run-command}         # e.g., make dev / npm run dev
\```

The application will be available at `http://localhost:{port}`.

## Documentation

- [Getting Started](docs/getting-started.md) — Full setup guide
- [Architecture](docs/architecture.md) — System overview
- [Contributing](CONTRIBUTING.md) — How to contribute
- [ADRs](docs/adr/) — Architecture decisions

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

The Operations section at the bottom is **Standard tier only** — drop it for Essential tier projects.

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

This same check works in production — point it at the deployed URL instead of localhost.

## Running Tests

\```bash
{test-command}
\```

## Common Issues

**{Problem 1}**
{Cause and solution}

**{Problem 2}**
{Cause and solution}

---

## Operations

### Logs

\```bash
{local-log-command}      # Local development
{prod-log-command}       # Production (e.g., kubectl logs, docker logs, cloud console)
\```

Patterns worth watching:
- `{pattern}` — indicates {meaning}

### Rollback

See [Deployment → Rollback](guides/deployment.md#rollback) for the deploy/rollback procedure. Do not duplicate steps here — they live with the deploy doc.

### Escalation

| Level | Contact | When to page |
|-------|---------|--------------|
| L1 | {team/person} | {criteria — e.g., "user-facing errors > 1%"} |
| L2 | {team/person} | {criteria — e.g., "data loss or outage > 15min"} |

For incident playbooks (symptoms → cause → resolution), see [Troubleshooting](guides/troubleshooting.md).
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

Major architecture decisions are documented as ADRs in [docs/adr/](adr/).
```

---

## docs/adr/template.md

```markdown
# ADR-{NNNN}: {Title}

## Status

{Proposed | Accepted | Deprecated | Superseded by ADR-NNNN}

## Date

{YYYY-MM-DD}

## Context

{What is the problem or situation that requires a decision? What forces are at play? What constraints exist?}

## Decision

{What is the decision that was made? State it clearly and concisely.}

## Alternatives Considered

### {Alternative 1}
{Brief description and why it was not chosen}

### {Alternative 2}
{Brief description and why it was not chosen}

## Consequences

**Positive:**
- {consequence}

**Negative:**
- {consequence}

**Neutral:**
- {consequence}
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

```markdown
# Deployment

## Environments

| Environment | URL | Branch |
|-------------|-----|--------|
| {env-name} | {url} | {branch} |

## Deploy Process

\```bash
{deploy-command-or-steps}
\```

## Pre-deploy Checklist

- [ ] Tests passing
- [ ] {check}
- [ ] {check}

## Rollback

\```bash
{rollback-command}
\```
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

```markdown
# API Reference

Base URL: `{base-url}`

{If auto-generated docs exist: "Interactive API documentation is available at `{url}/docs` (Swagger UI) and `{url}/redoc` (ReDoc)."}

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

