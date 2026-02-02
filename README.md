# Agent OS

A lightweight operating system for AI agents, based on [buildermethods/agent-os](https://github.com/buildermethods/agent-os). Here I added my own customizations to the original project.

## Agents that build the way you would

[Agent OS](https://buildermethods.com/agent-os) helps you shape better specs, keeps agents aligned in a lightweight system that fits how you already build.

Works alongside Claude Code, Cursor, Antigravity, and other AI tools. Any language, any framework.

**Core capabilities:**

- **Discover Standards** — Extract patterns and conventions from your codebase into documented standards
- **Deploy Standards** — Intelligently inject relevant standards based on what you're building
- **Shape Spec** — Create better plans that lead to better builds
- **Index Standards** — Keep your standards organized and discoverable

---

# Setup

Install a project with a specific profile:

```
~/agent-os/scripts/project-install.sh --profile python
```

---
### Documentation & Installation

Docs, installation, usage, & best practices 👉 [It's all here](https://buildermethods.com/agent-os)

# For Claude Code 

## Plugins 

This repo enables the following plugins:

| Name | Description | Contents |
|------|-------------|----------|
| [feature-dev](https://github.com/anthropics/claude-code/tree/main/plugins/feature-dev) | Comprehensive feature development workflow with a structured 7-phase approach | **Command:** `/feature-dev` - Guided feature development workflow<br>**Agents:** `code-explorer`, `code-architect`, `code-reviewer` - For codebase analysis, architecture design, and quality review |
| [pr-review-toolkit](https://github.com/anthropics/claude-code/tree/main/plugins/pr-review-toolkit) | Comprehensive PR review agents specializing in comments, tests, error handling, type design, code quality, and code simplification | **Command:** `/pr-review-toolkit:review-pr` - Run with optional review aspects (comments, tests, errors, types, code, simplify, all)<br>**Agents:** `comment-analyzer`, `pr-test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`, `code-reviewer`, `code-simplifier` |

## Skills

| Name | Description |
|------|-------------|
| `claude-md-progressive-disclosurer` | Optimize CLAUDE.md files using progressive disclosure for LLM efficiency |
| `competitors-analysis` | Analyze competitor repositories with evidence-based approach using actual cloned code |
| `copywriting` | Write, rewrite, or improve marketing copy for pages (homepage, landing, pricing, features, etc.) |
| `fastapi-api-key-auth` | Add API key authentication (X-API-Key header) to FastAPI applications |
| `frontend-design` | Create distinctive, production-grade frontend interfaces with high design quality |
| `improving-skills-from-sessions` | Analyze conversations to propose skill improvements based on what worked and edge cases |
| `macos-cleaner` | Analyze and reclaim macOS disk space through intelligent cleanup recommendations |
| `pytest-testing` | Generate pytest test suites with fixtures, parametrization, async support, and mocking |
| `setting-up-async-postgres` | Set up asynchronous PostgreSQL with SQLAlchemy for FastAPI applications |
| `setting-up-fastapi-projects` | Create production-ready FastAPI projects with async SQLAlchemy and layered architecture |
| `skill-creator` | Guide for creating effective skills that extend Claude's capabilities |
| `skill-reviewer` | Review and improve Claude Code skills against official best practices |
| `vercel-react-best-practices` | React and Next.js performance optimization guidelines from Vercel Engineering |

## Commands

### Agent OS Core Commands

Installed to projects via `project-install.sh`. Located in `commands/agent-os/`.

| Command | Description |
|---------|-------------|
| `/discover-standards` | Extract tribal knowledge from the codebase into documented standards |
| `/inject-standards` | Inject relevant standards into context (auto-suggest or explicit mode) |
| `/index-standards` | Rebuild and maintain the standards index file (`index.yml`) |
| `/shape-spec` | Gather context and structure planning for significant work in plan mode |
| `/plan-product` | Establish foundational product documentation (mission, roadmap, tech stack) |

### Project Commands

Located in `.claude/commands/`.

| Command | Description |
|---------|-------------|
| `/create-simple-feature-prd` | Create a detailed Product Requirements Document for a single feature |
| `/create-simple-feature-tasks` | Create a step-by-step task list from user requirements |
| `/create-update-changelog` | Create or update a changelog following semantic versioning |
| `/create-update-readme` | Create or update the README.md file |
| `/end-session` | Generate a concise session log with summary, changes, and next steps |
| `/fix-bug` | Explore a module and its dependencies to understand data flow and propose fixes |
| `/pr-summary` | Generate a pull request summary for the current branch |
