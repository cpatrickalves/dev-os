# Dev-OS

My personal development operating system — a curated repository of configurations, skills, sub-agents, and plugins that power my daily software development workflow with [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

This is where I document and evolve my **Vibe Coding** process.

---

## What's Inside

### Skills

Skills live in `skills/`, grouped by activity. The categories exist only in this repo: `import-skills.sh` shows them as headers in its picker and installs every skill flat into `.claude/skills/<name>/`, because Claude Code only discovers skills one level deep.

Legend: `/name` = invoked only as a slash command (`disable-model-invocation: true`, the former `commands/`); **global** = always installed into `~/.claude/skills/`.

#### `claude-code/` — sessions and skill maintenance

| Skill | Description |
|-------|-------------|
| `/end-session` **global** | Generate a session log with summary, changes, and next steps |
| `/handover` | Save a structured context dump to continue in a fresh session |
| `/logbook` **global** | Update the daily PT-BR work logbook at `.claude/logbook.md` |
| `napkin-runbook` **global** | Read and curate the repo's runbook of reusable rules (`.claude/napkin.md`) |
| `/skill-audit` | Audit a skill to test, benchmark, optimize, or remove it |
| `/skill-optimize-description` | Optimize a skill's description to improve triggering accuracy |
| `skill-reviewer` | Review and improve skills against official best practices |

#### `engineering/agents/` — AI agents and prompts

| Skill | Description |
|-------|-------------|
| `/ai-agent-security-analysis` | Audit an AI agent's security posture, MCP governance, and guardrails |
| `/prompt-optimizer` | Rightsize prompts, CLAUDE.md, SKILL.md, and tool descriptions |

#### `engineering/architecture/` — design quality

| Skill | Description |
|-------|-------------|
| `coupling-analysis` | Analyze module coupling by strength, distance, and volatility |
| `solid-checker` | Analyze and fix SOLID principle violations |

#### `engineering/build/` — building features

| Skill | Description |
|-------|-------------|
| `/create-update-makefile` | Create or update a self-documenting Makefile |
| `frontend-design` | Create distinctive, production-grade frontend interfaces |
| `frontend-testing` | Generate Vitest + React Testing Library tests |
| `playwright-expert` | Write and debug Playwright E2E tests |
| `python-async-postgres` | Set up async PostgreSQL with SQLAlchemy and test fixtures |
| `python-cashews-cache` | Add caching with cashews and a diskcache backend |
| `python-fastapi-api-key-auth` | Add X-API-Key header authentication to FastAPI apps |
| `python-fastapi-projects` | Create production-ready FastAPI projects with async SQLAlchemy |
| `python-testing` | Generate pytest suites with fixtures, parametrization, and mocking |

#### `engineering/code-review/` — reviewing code and PRs

| Skill | Description |
|-------|-------------|
| `ce-code-review` **global** | Structured review for bugs, regressions, tests, and standards |
| `frontend-code-review` | Review `.tsx`/`.ts`/`.js` files for quality, performance, and business logic |
| `/pr-review-to-subtasks` | Create work-item subtasks from a review file |
| `/pr-review-workflow` | Review an Azure DevOps PR and create subtasks from the review |
| `pr-security-review` **global** | Security review of an explicit `base...head` revision range |
| `/pr-summary` | Summarize the current branch's changes |

#### `engineering/documentation/` — docs, specs, and changelogs

| Skill | Description |
|-------|-------------|
| `/blitzy-create-codebase-docs` | Generate a codebase-ingestion doc at `docs/02-codebase.md` |
| `/blitzy-create-comprehensive-documentation` | Add module- and code-level documentation across the project |
| `/blitzy-create-product-description` | Create a structured product description |
| `/create-simple-feature-prd` | Create a single-feature PRD through clarifying questions |
| `/create-simple-feature-tasks` | Generate a phased task list from requirements |
| `/create-update-changelog` | Create or update CHANGELOG.md and tag the release |
| `create-update-readme` | Create or update the project README.md (PT-BR) |
| `docs-generator` **global** | Generate or update a standardized `docs/` folder |
| `user-story-spec-writer` | Turn vague user stories into specs ready for AI coding agents |

#### `engineering/git/`

| Skill | Description |
|-------|-------------|
| `/create-commit-message` | Create a commit message from the current diff |

#### `engineering/integrations/` — platform CLIs

| Skill | Description |
|-------|-------------|
| `azure-devops-cli` **global** | Manage Azure DevOps resources via the `az devops` CLI |
| `planecli` **global** | Manage Plane.so work items, cycles, and modules via planecli |

#### `learning/`

| Skill | Description |
|-------|-------------|
| `/explainer-graphic` | Create visual infographics using real-world analogies |
| `knowledge-distiller` | Distill transcripts, articles, or notes into a PT-BR knowledge document |

#### `productivity/` — writing, diagrams, and everyday tools

| Skill | Description |
|-------|-------------|
| `cognicode-sow` | Generate a Cognicode project scope document (SOW) |
| `competitors-analysis` | Evidence-based competitor analysis from actual cloned code |
| `copywriting` | Write and improve marketing copy for web pages |
| `/html-it` | Produce HTML output instead of markdown |
| `improve-tech-writing` | Apply clear technical writing patterns in PT-BR |
| `macos-cleaner` | Analyze and reclaim macOS disk space |
| `/mermaid-diagram-generator` | Generate interactive HTML diagrams with Mermaid.js |
| `sop-creator` | Create runbooks, playbooks, and technical documentation |
| `unslop` **global** | Cut AI tells from writing and restore human voice |
| `workflow-visualizer` | Map a system or workflow as an interactive HTML diagram |

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
├── skills/                # Reusable skills, grouped by category
│   ├── claude-code/       #   Session and skill maintenance
│   ├── engineering/       #   build, code-review, documentation, git, ...
│   ├── learning/          #   Knowledge distillation and explainers
│   └── productivity/      #   Writing, diagrams, ops, misc
├── agents/                # Sub-agent definitions
├── hooks/                 # Hook scripts (single source of truth)
├── workflows/             # Multi-agent workflow scripts
├── output-styles/         # Output styles
├── plugins/               # Curated plugin catalog
├── scripts/               # Import/install helper scripts
├── CONTEXT.md             # Domain glossary
└── .claude/               # Local session state + agents symlink
```

---

## How I Use This

This repo is my single source of truth for development configurations. I clone it and import the skills, agents, and other assets into each project with the scripts in `scripts/`. When I learn a new pattern or refine a workflow, I update it here so every future session benefits.

The skills cover the full stack I work with daily — from FastAPI backends and React frontends to project management, documentation, and code quality. The slash-only skills automate repetitive tasks like writing PRDs, changelogs, and PR summaries.

---

## Getting Started

1. Clone the repo into `~/dev-os`
2. From any project (including Dev-OS itself), run the import scripts to install assets:
   `~/dev-os/scripts/import-skills.sh`, `import-agents.sh` (per-project),
   `import-workflows.sh`, `import-output-styles.sh` (global, into `~/.claude/`).
   `import-skills.sh` lists the skills grouped by category in an interactive picker
   (`--all` skips it) and flattens the categorized `skills/` tree into `.claude/skills/<name>/`,
   since Claude Code only discovers skills one level deep. The skills listed in
   `GLOBAL_SKILLS` (e.g. `/end-session`) always go to `~/.claude/skills/` so every project sees them.
3. Open the project with Claude Code
4. Use `/create-simple-feature-tasks` to break down a feature, `/pr-summary` to summarize changes, or any other skill
