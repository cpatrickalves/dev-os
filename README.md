# Dev-OS

My personal development operating system — a curated repository of skills, sub-agents, workflows, output styles, hooks, and plugins that power my daily software development workflow with [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

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
| `/pr-review-to-subtasks` **global** | Create work-item subtasks from a review file |
| `/pr-review-workflow` | Review an Azure DevOps PR and create subtasks from the review |
| `pr-security-review` **global** | Security review of an explicit `base...head` revision range |
| `pr-description` **global** | Write a PR title and description |

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

### External plugins and skills

Third-party assets that are installed, not copied, are declared in two YAML catalogs at the repo root. To add one, add an entry to the YAML; the scripts build the install and update commands from its fields.

**Plugins** — [`external-plugins.yaml`](external-plugins.yaml), installed with `scripts/install-plugins.sh`.

| Plugin | Marketplace | Scope | Description |
|--------|-------------|-------|-------------|
| `github` | official | user | GitHub plugin |
| `claude-md-management` | official | user | CLAUDE.md management |
| `skill-creator` | official | user | Skill scaffolding helper |
| `claude-code-setup` | official | user | Claude Code setup helper |
| `thermos` | dev-os (this repo, `plugins/`) | user | Thermo-nuclear branch review |
| `compound-engineering` | [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) | user | Compound Engineering pipeline |
| `andrej-karpathy-skills` | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | user | Andrej Karpathy guideline skills |
| `mattpocock-skills` | official | user | Matt Pocock skills |
| `pyright-lsp` | official | project | Python type checking |
| `typescript-lsp` | official | project | TypeScript type checking |
| `frontend-slides` | [zarazhangrui/frontend-slides](https://github.com/zarazhangrui/frontend-slides) | project | Frontend slides |

**Mods** — [`external-mods.yaml`](external-mods.yaml), installed and uninstalled with `scripts/manage-mods.sh install|uninstall`. A mod is a plugin built from function hooks that changes the Claude Code UI (panes, bands, status lines). Uninstall leaves the marketplace registered. A mod with `marketplace: builtin` ships with Claude Code and is enabled/disabled instead.

| Mod | Marketplace | Scope | Description |
|-----|-------------|-------|-------------|
| `savvy-progress` | [JohnnyVizz/claude-kit](https://github.com/JohnnyVizz/claude-kit) | user | Progress bar above the prompt and subagents panel (`/agents-info`) |

**Skill packages** — [`external-skills.yaml`](external-skills.yaml), installed with `scripts/install-external-skills.sh` through `npx skills add`.

| Package | Source | Scope | Description |
|---------|--------|-------|-------------|
| `langchain-skills` | [langchain-ai/langchain-skills](https://github.com/langchain-ai/langchain-skills) | project | LangChain, LangGraph and Deep Agents skills |
| `shadcn-ui` | [shadcn/ui](https://ui.shadcn.com/docs/skills) | project | shadcn/ui skills |

Third-party skills copied into `skills/` (such as `unslop`) record their upstream in frontmatter: `metadata.source` (a GitHub `tree/<ref>/<dir>` URL of the skill directory, or a gist URL with a `#file-<name>` anchor), `metadata.last_synced` (the date of the last copy from upstream, which is what marks a skill as third-party) and `metadata.local_changes` (what was adapted locally, or `"None."`). Own skills that are only inspired by external material cite it in `metadata.reference` instead.

`scripts/sync-third-party-skills.sh` lists them with the upstream changes since `last_synced`, and shows the upstream diff for the skills you pick. With `--apply` it merges those changes into the local copy (a three-way merge per file, so local adaptations survive; conflicts are left as markers) and bumps `last_synced`. It needs an authenticated `gh` and never commits.

### Agents

Sub-agents in `agents/`, imported per project with `scripts/import-agents.sh`.

| Agent | Description |
|-------|-------------|
| `ce-code-simplicity-reviewer` | Final review pass for YAGNI violations and simplification opportunities |
| `framework-docs-researcher` | Gather official docs, version constraints, and best practices for a dependency |
| `frontend-code-reviewer` | Review recently changed frontend code (components, styles, hooks) |

### Workflows

Multi-agent workflow scripts in `workflows/`, installed globally into `~/.claude/workflows/` with `scripts/import-workflows.sh`.

| Workflow | Description |
|----------|-------------|
| `dev-flow` | Implement a markdown plan, open a PR, review it with 5 reviewers, apply the fixes, and audit the docs |
| `code-review-flow` | Review an existing PR with 5 reviewers and produce a verified final report |

Both rely on the `thermos` and `mattpocock-skills` plugins and on the `ce-code-review` and `pr-security-review` skills.

### Output Styles

Output styles in `output-styles/`, installed globally with `scripts/import-output-styles.sh`.

| Style | Description |
|-------|-------------|
| `ELI5` | Keep explanations simple |
| `Escrita Técnica Clara` | Direct PT-BR technical writing, without anglicisms or filler |

### Hooks

`hooks/log-skill.sh` logs every Skill invocation (timestamp, skill, args) to the project's `.claude/skill-usage.log`. Run `scripts/setup-skill-hook.sh` once per machine to copy it into `~/.claude/hooks/` and register it as a `PreToolUse` hook. Requires `jq`.

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
├── plugins/               # Dev-OS's own plugin marketplace (thermos)
├── scripts/               # Import/install helper scripts
├── docs/                  # Reference notes (LangGraph practices)
├── external-plugins.yaml  # External plugins to install
├── external-mods.yaml     # Claude Code mods to install or uninstall
├── external-skills.yaml   # External skill packages to install
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
3. Install external plugins and skill packages with `~/dev-os/scripts/install-plugins.sh`
   and `install-external-skills.sh` (picker; `--all` skips it). Both update entries
   already installed, so rerun them to refresh. Mods go through
   `~/dev-os/scripts/manage-mods.sh install` (or `uninstall`).
4. Once per machine, run `~/dev-os/scripts/setup-skill-hook.sh` to log skill usage
5. Open the project with Claude Code
6. Use `/create-simple-feature-tasks` to break down a feature, `/pr-description` to write a PR description, or any other skill
