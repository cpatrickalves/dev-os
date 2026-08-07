# Dev-OS

My personal development operating system — a curated repository of configurations, skills, commands, sub-agents, and plugins that power my daily software development workflow with [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

This is where I document and evolve my **Vibe Coding** process.

---

## What's Inside

### Skills

Reusable skill modules that extend Claude Code with specialized knowledge and workflows.

| Skill | Category | Description |
|-------|----------|-------------|
| `skill-creator` | Development | Guide for creating effective Claude Code skills |
| `skill-reviewer` | Development | Review and improve skills against best practices |
| `solid-checker` | Development | Analyze and fix SOLID principle violations |
| `setting-up-fastapi-projects` | Python | Create production-ready FastAPI projects with async SQLAlchemy |
| `setting-up-async-postgres` | Python | Set up async PostgreSQL with SQLAlchemy and test fixtures |
| `fastapi-api-key-auth` | Python | Add X-API-Key header authentication to FastAPI apps |
| `pytest-testing` | Python | Generate pytest suites with fixtures, parametrization, and mocking |
| `python-cashews-cache` | Python | Async caching with cashews library and diskcache backend |
| `frontend-design` | Frontend | Create distinctive, production-grade frontend interfaces |
| `copywriting` | Frontend | Write and improve marketing copy for web pages |
| `vercel-react-best-practices` | Frontend | React/Next.js performance optimization (57 rules across 8 categories) |
| `sop-creator` | Operations | Create runbooks, playbooks, and technical documentation |
| `competitors-analysis` | Operations | Evidence-based competitor analysis from actual cloned code |
| `azure-devops-cli` | Operations | Azure DevOps resource management via CLI |
| `planecli` | Operations | Plane.so project management via CLI |
| `improving-skills-from-sessions` | Productivity | Analyze sessions to propose skill improvements |
| `macos-cleaner` | Productivity | Analyze and reclaim macOS disk space |

### Commands

Custom slash commands available in Claude Code.

| Command | Description |
|---------|-------------|
| `/create-simple-feature-prd` | Create a detailed Product Requirements Document |
| `/create-simple-feature-tasks` | Generate a step-by-step task list from requirements |
| `/create-update-changelog` | Create or update a changelog with semantic versioning |
| `/create-update-readme` | Create or update the project README |
| `/create-update-makefile` | Create or update a Makefile for automation |
| `/pr-summary` | Generate a pull request summary for the current branch |
| `/end-session` | Generate a session log with summary, changes, and next steps |
| `/improve-specs` | Refine specification documents through detailed interview |
| `/blitzy-create-product-description` | Create a marketing product description |
| `/blitzy-create-codebase-docs` | Generate comprehensive codebase documentation |
| `/blitzy-create-comprehensive-documentation` | Generate full project documentation |

### Plugins

Official Claude Code plugins enabled in this workspace.

| Plugin | Description |
|--------|-------------|
| [feature-dev](https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev) | 7-phase feature development workflow with `code-explorer`, `code-architect`, and `code-reviewer` agents |
| [pr-review-toolkit](https://github.com/anthropics/claude-code/tree/main/plugins/pr-review-toolkit) | PR review with specialized agents for comments, tests, error handling, types, code quality, and simplification |
| pyright-lsp | Python type checking |
| typescript-lsp | TypeScript type checking |
| claude-md-management | Markdown management tools |

## Project Structure

```
dev-os/
├── skills/                # Reusable skill modules
├── commands/              # Custom slash commands
├── agents/                # Sub-agent definitions
├── hooks/                 # Hook scripts (single source of truth)
├── workflows/             # Multi-agent workflow scripts
├── output-styles/         # Output styles
├── plugins/               # Curated plugin catalog
├── scripts/               # Import/install helper scripts
├── CONTEXT.md             # Domain glossary
└── .claude/               # Local session state + symlinks to the
                           # root asset folders (enables auto-load)
```

---

## How I Use This

This repo is my single source of truth for development configurations. I clone it, and Claude Code picks up all the skills, commands, and plugins automatically. When I learn a new pattern or refine a workflow, I update it here so every future session benefits.

The skills cover the full stack I work with daily — from FastAPI backends and React frontends to project management, documentation, and code quality. The commands automate repetitive tasks like writing PRDs, changelogs, and PR summaries.

---

## Getting Started

1. Clone the repo into `~/dev-os`
2. Open it with Claude Code — skills, commands, and agents auto-load via the `.claude/` symlinks
3. From any other project, run the import scripts to install assets:
   `~/dev-os/scripts/import-skills.sh`, `import-commands.sh`, `import-agents.sh` (per-project),
   `import-workflows.sh`, `import-output-styles.sh` (global, into `~/.claude/`)
4. Use `/create-simple-feature-tasks` to break down a feature, `/pr-summary` to summarize changes, or any other command
