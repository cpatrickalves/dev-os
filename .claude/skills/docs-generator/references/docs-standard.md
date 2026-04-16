# Documentation Standard

This reference defines the documentation standard for all projects. It is based on the Diátaxis framework, Architecture Decision Records (ADR/MADR 4.0), and modern AI agent configuration practices (AGENTS.md).

## Core principles

1. **Document decisions, not descriptions.** Code describes itself; what's missing is the *why* behind choices. ADRs capture this with minimal overhead.
2. **Write for two audiences.** Human developers and AI coding agents read the same content. AGENTS.md and docs/ serve them simultaneously.
3. **Maintain ruthlessly or don't write at all.** Six maintained documents beat sixty stale ones. Outdated documentation is worse than no documentation.
4. **Consult, don't read.** Developers don't read docs linearly — they consult them. Structure for scanning: headers, short paragraphs, code blocks.

## Two-tier structure

### Essential tier

```
project-root/
├── README.md                        # Project card: what, why, quickstart
├── AGENTS.md                        # AI agent context (universal)
├── docs/
│   ├── getting-started.md           # Environment setup + first run
│   └── architecture.md              # System overview, component map (with inline "Key Decisions")
```

Essential tier intentionally omits a formal `adr/` directory — for solo projects and POCs, ADR ceremony is overhead. Capture decisions as a "Key Decisions" bullet list inside `architecture.md`. Promote to formal ADRs only when you reach Standard tier or when a single decision needs more than 3 lines of justification.

**When to use:** Solo projects, small utilities, scripts, POCs, internal tools with 1-2 developers that are not consumed by other teams or systems.

**The criterion:** You are the only person who needs to understand this project. The docs exist so your future self (and AI agents) can pick it up after weeks away.

### Standard tier

```
project-root/
├── README.md
├── AGENTS.md
├── CONTRIBUTING.md                  # Dev workflow, code style, PR process
├── docs/
│   ├── getting-started.md
│   ├── architecture.md
│   ├── guides/                      # How-to guides (Diátaxis)
│   │   ├── deployment.md
│   │   ├── configuration.md
│   │   └── troubleshooting.md
│   ├── reference/                   # Technical reference (Diátaxis)
│   │   ├── api.md
│   │   └── environment-variables.md
│   └── adr/
│       ├── template.md
│       └── 0001-initial-tech-choices.md
```

**When to use:** Any project in production, with 3+ contributors, or consumed by other teams/systems. This includes APIs, services, platforms, full-stack applications, and anything deployed to production — regardless of complexity.

**The criterion:** Someone besides you needs to understand this project to work with it. If another developer, team, or system depends on this project, it's Standard tier.

## Content guidelines per document

### README.md
**Purpose:** The storefront. A new developer or AI agent reads this first.
**Target length:** 40-80 lines (applications) / 40-200 lines (published libraries — extra room for badges, install matrix, usage examples, compatibility tables)
**Must contain:**
- Project name and one-line description
- Tech stack badges or summary
- Prerequisites
- Quick start (3-5 commands to run the project)
- Link to docs/ for detailed documentation
- License (if applicable)

**Must NOT contain:**
- Detailed architecture (link to docs/architecture.md)
- Full API reference (link to docs/reference/api.md)
- Contribution guidelines (link to CONTRIBUTING.md)
- Extensive badges/shields that push content below the fold

### AGENTS.md
**Purpose:** Universal AI coding agent configuration. Single source of truth for project context consumed by Claude Code, Cursor, Copilot, Windsurf, and 20+ other tools.
**Target length:** 50-200 lines (heuristic, not hard limit). The official AGENTS.md spec has no required fields or size cap — but every line is read on every AI session, so trim ruthlessly. Above ~200 lines, ask whether the content earns its token cost.
**Must contain:**
- One-line project description
- Tech stack with specific versions
- Documentation language directive
- Essential commands: dev, test, build, lint, format, type-check
- Directory map (only key folders, not exhaustive)
- Non-obvious conventions (naming patterns, import rules, error handling)
- Common gotchas
- Links to key docs/ files

**Must NOT contain:**
- Standard language conventions AI already knows
- Style rules enforced by linters (reference the linter instead)
- Full API documentation (link to docs/reference/api.md)
- Personality instructions ("be a senior engineer")

**Format notes:**
- Use headers to organize sections
- Use code blocks for commands
- Keep descriptions to one line where possible
- Every line costs context window tokens on every AI session — be ruthless

### docs/getting-started.md
**Purpose:** Get a new developer from zero to running the project locally.
**Target length:** 50-100 lines
**Must contain:**
- Prerequisites (runtime versions, system dependencies, tools)
- Step-by-step environment setup
- How to run the project locally
- How to run tests
- How to verify everything works (expected output, health check URL, etc.)
- Common setup problems and solutions (2-3 most frequent)

**Scope discipline (Diátaxis):** This is a tutorial — onboarding-only. Do not mix in operational content (production logs, rollback, escalation). That belongs in `docs/guides/deployment.md`.

**Success metric:** A new developer should go from clone to running in < 30 minutes.

### docs/architecture.md
**Purpose:** System overview for understanding component interactions.
**Target length:** 60-120 lines
**Must contain:**
- High-level system description (1-2 paragraphs)
- Component diagram (Mermaid preferred, ASCII acceptable)
- Key components and their responsibilities (brief)
- Data flow for the primary use case
- External dependencies and integrations
- **Key Decisions:**
  - Essential tier: 5-10 bullets inline, each one decision + 1-line rationale. This replaces a separate `adr/` for small projects.
  - Standard tier: brief summary + link to `docs/adr/` (ADRs have the detail).

**Diagram guidance:**
- Use Mermaid syntax for maintainability
- C4 Level 1 (System Context) is almost always sufficient
- C4 Level 2 (Container) for complex systems
- Don't go deeper than Level 2 in this document

### docs/adr/template.md
**Purpose:** Standardized template for architecture decision records.
**Format:** MADR 4.0 (Markdown Any Decision Records)

### docs/adr/NNNN-decision-title.md
**Purpose:** Capture the why behind technical decisions.
**Target length:** 20-50 lines
**Format:** MADR 4.0 (Markdown Any Decision Records).
**Must contain:**
- YAML front matter with `status` (proposed | accepted | deprecated | superseded by ADR-NNNN) and `date` (YYYY-MM-DD)
- `# ADR-NNNN: {Title}` heading
- **Context and Problem Statement** — what forces / constraints / pain point prompted this
- **Considered Options** — at least 2, listed up front
- **Decision Outcome** — which option was chosen and the main driver. Optionally followed by per-option "Pros and Cons of the Options"
- **Consequences** — positive, negative, neutral

**Optional but recommended:**
- `decision-makers` field in YAML front matter (names or roles — for audit/traceability)
- "Confirmation" section describing how the decision is validated (fitness function, ArchUnit test, code review checklist)

**Numbering:** Sequential 4-digit: 0001, 0002, 0003...
**Naming:** `NNNN-kebab-case-title.md`

### CONTRIBUTING.md (Standard tier)
**Purpose:** How to contribute code to this project.
**Target length:** 40-80 lines
**Must contain:**
- Development workflow (branch strategy, PR process)
- Code style and formatting (tools used, not rules — "run `ruff format`")
- Commit message convention
- Testing requirements
- Review process

### docs/guides/ (Standard tier)

**deployment.md** — How to deploy and operate the application. Must document the actual deployment process, not an aspirational one. For typical Docker-based projects (the common case), this single file replaces a separate runbook.

Required sections:
- Environments (dev / staging / prod with URLs)
- Deploy Process (the real commands — `docker compose up -d`, `kubectl apply`, etc.)
- Pre-deploy Checklist
- Logs (how to tail them locally and in production)
- Rollback (the real procedure)
- Escalation (L1/L2 contacts and paging criteria) — only if the project has on-call

Link to `troubleshooting.md` for incident playbooks (symptoms → cause → resolution); do not duplicate.

**configuration.md** — How to configure the application for different environments. Document all configuration mechanisms (env vars, config files, CLI flags). Link to docs/reference/environment-variables.md for the complete reference.

**troubleshooting.md** — Solutions to common problems. Format: Problem → Cause → Solution. Each entry should be scannable.

**Target length per guide:** 30-80 lines

### docs/reference/ (Standard tier)

**api.md** — API contract documentation.
- **If the project serves auto-generated API docs (OpenAPI/Swagger UI, ReDoc, GraphQL playground), keep this file as a stub of <15 lines that links to them.** Do not duplicate endpoint shapes — manual docs rot the moment a route changes. The stub should list the URLs (e.g., `/docs`, `/redoc`, `/openapi.json`) and any non-obvious detail not covered by the generated docs (auth scheme, rate limits, deprecation policy).
- **Only write the long form** when the project does NOT serve generated docs (libraries with public interfaces, REST APIs without OpenAPI). Then document endpoints, methods, request/response shapes manually.

**environment-variables.md** — Complete reference of all environment variables. Format as a table organized by category (database, auth, external services, feature flags). Include: variable name, required/optional, default value, description.

## Language guidelines

- Documentation language is defined by the project's AGENTS.md or CLAUDE.md
- Templates are provided in English as a neutral baseline — translate when generating
- Technical terms in English are acceptable and preferred when they are the industry standard (API, endpoint, middleware, deploy, commit, merge, branch)
- Keep sentences short. One idea per sentence.
- Use active voice
- Use code blocks for all commands, file paths, and technical identifiers
- Use Mermaid for diagrams — it's version-controlled and renderable in GitHub/GitLab
