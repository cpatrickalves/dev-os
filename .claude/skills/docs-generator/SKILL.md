---
name: docs-generator
description: >
  Generate or update standardized project documentation (docs/ folder) for any codebase.
  Use this skill whenever the user wants to create project docs, update existing documentation,
  scaffold a docs/ folder, generate a README, create ADRs, write getting-started guides,
  produce architecture docs, or audit documentation completeness for a repository. Also
  triggers when the user mentions "documentar o projeto", "docs do projeto", "criar docs",
  "atualizar documentação", "docs/ folder", "onboarding docs", "AGENTS.md", "CLAUDE.md",
  or asks to prepare a codebase for new developers or AI coding agents. Also use after
  shipping commits or before opening a PR — the skill can scope the update to a branch's
  commits ("sync docs to this branch", "atualiza docs com o que mudou", "what docs need
  updating before this PR", "after-ship docs") instead of scanning the whole codebase.
  Works with any tech stack — Python, TypeScript, Rust, Go, Java, etc. Even if the user
  just says "document this repo" or "what docs are missing", use this skill.
---

# Docs Generator

Generate or update a standardized `docs/` folder for any software project, optimized for both human developer onboarding and AI coding agent comprehension.

## Overview

This skill analyzes a codebase and produces or updates the project documentation following a two-tier standard based on the Diátaxis framework, Architecture Decision Records (ADR), and modern AI agent configuration practices. The output is a set of Markdown files that live in the repository alongside the code.

The guiding philosophy: **six well-maintained documents beat sixty stale ones.** Every file this skill generates must earn its place by answering a real question a new developer or AI agent would ask. If a document doesn't pass this test, it doesn't get created.

## Before you start

1. Read `references/docs-standard.md` — it contains the full documentation standard, tier definitions, and content guidelines for every document type.
2. Read `references/templates.md` — it contains the Markdown templates for each file.

## Workflow

### Phase 1: Analyze the codebase

Scan the repository to understand what exists. Do this systematically:

```
1. Read the directory tree (2 levels deep)
2. Identify the tech stack:
   - Python: pyproject.toml, setup.py, requirements.txt, uv.lock
   - TypeScript/JS: package.json, tsconfig.json
   - Rust: Cargo.toml
   - Go: go.mod
   - Java: pom.xml, build.gradle
   - Multi-stack: check for monorepo patterns
3. Read existing documentation:
   - README.md (if exists)
   - docs/ folder (if exists)
   - AGENTS.md, CLAUDE.md, .cursorrules (if exist)
   - CONTRIBUTING.md, CHANGELOG.md (if exist)
4. Read key config files for project metadata:
   - Package name, version, description
   - Dependencies (to understand the tech landscape)
   - Scripts/commands (dev, test, build, lint, deploy)
   - **Maintainers / authors** — for the README's Maintainers section:
     - Python: `pyproject.toml` `[project.authors]` or `[tool.poetry.authors]`, `setup.cfg` `[metadata] author`
     - Node: `package.json` `author` / `contributors`
     - Rust: `Cargo.toml` `[package] authors`
     - Java: `pom.xml` `<developers>`
     - Go: `go.mod` module owner / `AUTHORS` file
     - Fallback when metadata is missing: `git log --format="%an <%ae>" | sort | uniq -c | sort -rn | head -5`
     - If still nothing, leave a TODO marker — never invent names
5. Identify the project type:
   - API backend, web frontend, CLI tool, library, full-stack app, monorepo
6. Check for existing CI/CD:
   - .github/workflows/, Dockerfile, docker-compose.yml, Makefile
7. Capture the directory tree for the README's "Project Structure" section:
   - Run `tree -L 2 -I '*.pyc|__pycache__|node_modules|.git|dist|build|.venv'` (or stack-equivalent ignore patterns)
   - Trim further if the result exceeds ~30 lines
```

Capture findings in a mental model before generating anything. The analysis determines what documentation tier to recommend and what content to generate.

### Phase 2: Determine the documentation tier

Based on the analysis, recommend one of two tiers. Present your recommendation to the user with a brief rationale before proceeding.

**Essential tier** — Solo projects, small utilities, scripts, POCs, internal tools with 1-2 developers that are not consumed by other teams or systems.
Produces: README.md, AGENTS.md, docs/getting-started.md, docs/architecture.md (with an inline "Key Decisions" bullet list — no formal ADR directory at this tier).

**Standard tier** — Any project in production, with 2+ contributors, or consumed by other teams/systems. This includes APIs, services, platforms, and full-stack applications regardless of complexity. The criterion: *someone besides you needs to understand this project to work with it*.
Adds: CONTRIBUTING.md, docs/guides/ (deployment, configuration, troubleshooting), docs/reference/ (API, environment variables), docs/adr/ (template + initial decision records following MADR 4.0). Operational content (logs, rollback, escalation) lives in `docs/guides/deployment.md` — the file does double duty as deploy + operate doc, so there is no separate runbook. `docs/getting-started.md` stays scoped to onboarding only (Diátaxis: tutorials and how-to guides do not mix).

The user can override the recommendation. Ask them before proceeding if they want a different tier or want to include/exclude specific documents.

### Phase 3: Generate documentation

For each document, follow this process:

1. **Extract real information from the codebase.** Never generate placeholder content when real data exists. If the project uses FastAPI, read the route files and document actual endpoints. If there's a Dockerfile, document the actual build process.

2. **Use the templates from `references/templates.md`** as starting points, but adapt them to the project's reality. Remove template sections that don't apply. Add sections that the project needs but the template doesn't cover.

3. **Write in the language defined by AGENTS.md.** Check the project's AGENTS.md or CLAUDE.md for a language directive. If none exists, check the language of the existing README or codebase comments. If still ambiguous, ask the user. Templates are provided in English as a neutral baseline — translate to the target language when generating.

4. **Keep documents short.** Target lengths (heuristics, not dogma):
   - README.md: 60-200 lines (applications) / 40-200 lines (published libraries) — the full spec includes Overview, Features, Project Structure, Prerequisites, Tech Stack, Installation, Usage, Documentation links, and Maintainers
   - getting-started.md: 50-100 lines
   - architecture.md: 60-120 lines
   - Individual guides: 30-80 lines (deployment.md may go up to 100 when it includes Logs + Escalation)
   - ADR entries: 20-50 lines (MADR 4.0)
   - AGENTS.md: 50-200 lines (no hard cap in the official AGENTS.md spec, but every line costs context tokens on every AI session — trim ruthlessly)

5. **Link, don't duplicate.** If something is documented in one place, link to it from others. The README links to docs/. The getting-started guide links to reference docs. ADRs link to relevant architecture sections.

### Phase 4: Generate AGENTS.md

Create AGENTS.md at the project root. This is the universal AI agent instruction file read by Claude Code, Cursor, Copilot, Windsurf, Codex, Jules, Junie, Devin, and 20+ other tools. It is the single source of truth for AI agent context.

The AGENTS.md must contain:
- One-line project description and primary tech stack
- Documentation language directive (e.g., "All docs and comments in PT-BR")
- Essential commands (dev, test, build, lint, format)
- Directory layout of the most important folders (not exhaustive — only what an AI
  needs to navigate)
- Non-obvious conventions the AI wouldn't guess from reading code alone
- Common gotchas and known sharp edges
- Links to key docs/ files for deeper context

What AGENTS.md must NOT contain:
- Standard language conventions the AI already knows
- Style rules enforced by linters (say "run `ruff check`" instead of listing rules)
- Full API documentation (link to docs/reference/api.md instead)
- Personality instructions ("be a senior engineer", "think step by step")

**Tool-specific files:** If the project also needs CLAUDE.md (for Claude Code @import directives), .cursor/rules/*.mdc, or .github/copilot-instructions.md, generate them with content that complements AGENTS.md rather than duplicating it. CLAUDE.md in
particular should use `@import` to pull in AGENTS.md and relevant docs/ files.

### Phase 5: Create ADR entries

For every significant technical decision visible in the codebase, create an ADR entry.
Look for signals like:

- Framework choices (why FastAPI over Django? why React over Vue?)
- Database selection
- Authentication approach
- Deployment strategy
- Monorepo vs multi-repo
- State management choices
- API design patterns (REST vs GraphQL)

If the decision rationale isn't obvious from the code, write the ADR with the decision and consequences filled in, but mark the "Context" section with a note asking the team to complete it:

```markdown
## Context
<!-- TODO: The team should document the original context for this decision -->
Based on the codebase analysis, the project uses [X]. The specific reasons for
choosing [X] over alternatives should be documented here by team members who
were part of this decision.
```

This is better than skipping the ADR entirely — it at least captures *what* was decided and prompts the team to fill in *why*.

### Phase 6: Validate and present

Before presenting files to the user:

1. **Check cross-references.** Every link between documents must point to an actual file.
2. **Verify commands.** If you documented a `make dev` command, confirm a Makefile exists.
   If you said "run `uv sync`", confirm uv.lock or pyproject.toml exists.
3. **Check for staleness signals.** If the README mentions Python 3.9 but pyproject.toml
   requires >=3.11, flag the discrepancy.
4. **Run a completeness check** against the chosen tier — every required document exists.

Present the generated files to the user with a brief summary of what was created and why. Offer to adjust any document before finalizing.

## Update mode

When the user asks to update existing documentation (rather than create from scratch):

1. Read all existing docs first
2. Diff the existing content against what the codebase now shows
3. Identify:
   - Outdated information (wrong versions, removed endpoints, changed commands)
   - Missing documentation (new features, new services, undocumented decisions)
   - Orphaned docs (documents about features that no longer exist)
4. Present a summary of proposed changes before making them
5. Apply changes surgically — preserve the team's voice and custom content, only updating
   factual information and adding missing pieces

Never overwrite custom content the team has written. When updating, merge new information into existing documents rather than regenerating from scratch.

## Commit-scoped update mode

Use this mode when the user just shipped (or is about to ship) work and wants documentation synced to what *changed* — typically before opening a PR. It is faster and narrower than full Update mode: it only looks at commits within a scope (a branch, a time window, a commit range), not at the whole codebase.

Triggers include "atualiza docs com o que mudou", "sync docs to this branch", "what docs need updating before this PR", "after-ship docs", or any update request issued from a feature branch.

### Default scope

When the user does not specify a scope, infer it from the current git state and **always show the user the scope you picked before scanning** so they can correct it.

1. **On a feature branch** (current branch is not `main` / `master` / `dev`): use commits since the branch diverged from the default branch.
   ```bash
   DEFAULT_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')
   BASE=$(git merge-base HEAD "origin/${DEFAULT_BRANCH:-main}")
   git log --reverse "$BASE..HEAD"
   ```
2. **On `main` / `master` / `dev`**: fall back to the last 24 hours.
   ```bash
   git log --since="24 hours ago"
   ```
3. **User-specified** (always wins): respect explicit windows ("last 3 days", "since v1.2.0", "since commit abc123") or paths ("just look at api/").

### Workflow

Four steps: Scan → Approve → Update → Summary. Track progress as you go.

#### Step 1 — Scan

For each commit in scope, examine the diff and classify as doc-worthy or skip.

**Update the docs when the commit introduces:**
- New features or capabilities visible to users / API consumers
- API changes (endpoints, parameters, request/response shapes, breaking changes)
- New configuration options or environment variables
- New CLI commands or flags
- Changes to user-facing behavior or defaults
- New dependencies that change Prerequisites or Tech Stack

**Skip when the commit is:**
- Internal refactoring with no behavior change
- Test-only changes
- Minor bug fixes that don't change documented behavior
- Typo corrections in code
- Performance optimizations without user-visible impact
- Build / CI / lint config changes

Be conservative — when in doubt, skip. A missed update is fixable; noisy doc churn erodes trust. If nothing significant is found, report this to the user and stop. Do not proceed to Step 2.

#### Step 2 — Approve

Present findings as a structured summary, grouped by commit, naming the affected files and the proposed change. Then ask the user how to act on them:

```
Found N doc-worthy changes in scope (BASE..HEAD on branch <name>):

1. [abc123] Added /v2/users endpoint
   → docs/reference/api.md (Mode 1 stub: verify Swagger link still resolves)
   → AGENTS.md (no change needed — endpoint is auto-discovered)

2. [def456] New env var STRIPE_WEBHOOK_SECRET
   → docs/reference/environment-variables.md (add row)
   → README.md Prerequisites (mention webhook setup)

Which updates should I apply?
- all   — apply everything above
- pick  — let me choose specific items
- none  — stop here, I just wanted the audit
```

Wait for the user's response. If they pick specific items, confirm the list before proceeding.

#### Step 3 — Update

For each approved update:
- Read the **full** target file (not just the section being changed) so you have context for tone and structure
- Read the source files referenced by the commit so the update is grounded in real code, not the commit message
- Apply the change surgically — additive when possible; preserve the team's voice and existing accurate content
- Match existing verbosity — don't expand a terse doc into a long one

Spawn writer subagents in parallel for independent files when there are several to update. If one fails, report the error for that file and continue with the others.

#### Step 4 — Summary

Report file-by-file:
- File path
- What was changed (one line)
- What was left alone (one line, only if interesting — e.g., "kept the team's prose in Overview untouched")
- Anything ambiguous the user should sanity-check before merging

## Audit mode

When the user asks to audit or check documentation completeness:

1. Analyze the codebase and existing docs
2. Run `scripts/docs_audit.py <project-path>` to get a completeness score
3. Present the gap analysis showing what's missing or outdated
4. Offer to generate or fix specific items

The audit script auto-detects the appropriate tier and checks for missing files, stale documents (>180 days without updates), and TODO markers. It also detects alternative file locations (e.g., CLAUDE.md as an alternative to AGENTS.md).

## Important constraints

- **Never generate fake content.** If you can't determine something from the codebase, leave a clear TODO marker rather than inventing information.
- **Respect existing structure.** If the project already has a `docs/` folder with custom organization, adapt to it rather than imposing the standard structure blindly.
- **Commands must be verified.** Every command you document must correspond to something real in the project (Makefile target, package.json script, documented CLI, etc.).
- **ADRs should reflect reality.** Only create ADR entries for decisions that are actually visible in the codebase. Don't speculate about decisions that might have been made.
- **AGENTS.md budget is sacred.** Every line in AGENTS.md costs context window tokens on every AI session. Be ruthlessly concise. The test: "If I remove this line, will the AI make mistakes?" If no, cut it.
