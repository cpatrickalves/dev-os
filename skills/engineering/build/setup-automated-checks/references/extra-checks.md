# Extra checks

Checks cost CPU, so the default set is a floor. Each entry says what lie or defect it catches, how to install it and where it runs. **Tier 1** fits every project and is offered as a multi-select in Step 2. **Tier 2** depends on the project's shape; offer an entry only when the audit shows the shape.

## Tier 1: offer to every project

| Check | Catches | Python | TypeScript | Runs |
|---|---|---|---|---|
| Secrets | credentials committed by accident | `gitleaks` pre-commit hook (`repo: https://github.com/gitleaks/gitleaks`, id `gitleaks`) | same hook | pre-commit + CI |
| Dead code | unreachable modules, unused exports and dependencies left behind by refactors | `vulture app/ --min-confidence 80` (uv dev dep) and `deptry .` (unused / missing / transitive deps) | `knip` (`pnpm add -D knip`, `pnpm knip`) | CI, `make lint` |
| Test order independence | tests that pass only in file order (shared state), a classic lie | `pytest-randomly` (no config needed) | Vitest `sequence: { shuffle: true }` | every test run |
| Timeouts | a hung test that blocks CI for hours | `pytest-timeout`, `timeout = 60` in `[tool.pytest.ini_options]` | Vitest `testTimeout` (default 5s already) | every test run |
| Conventional Commits | commit messages outside `tipo(escopo): texto (ID)` | `repo: https://github.com/compilerla/conventional-pre-commit`, stage `commit-msg` | same hook, or `commitlint` with Husky `commit-msg` | commit-msg |
| Dependency audit | known CVEs in locked dependencies | `uv run pip-audit` (dev dep) or `uvx pip-audit -r <(uv export --no-dev)` | `pnpm audit --prod --audit-level high` | CI, non-blocking at first |
| Dockerfile lint | broken layer caching, unpinned base images, root user | `hadolint` via `docker run --rm -i hadolint/hadolint:<ver> < Dockerfile` | same | `make lint-infra` |
| Spelling | typos in identifiers and docs | `codespell` pre-commit hook (`repo: https://github.com/codespell-project/codespell`) with `--ignore-words-list` for domain terms | same | pre-commit |
| Commented-out code | dead code kept "just in case" | ruff `ERA` group; expect `ERA001` false positives on prose comments that look like code (`# key: value`) | — | `make lint` |
| Type-only imports | import cycles and slower startup from imports used only in annotations | ruff `TC` group, **only** with `[tool.ruff.lint.flake8-type-checking] runtime-evaluated-base-classes = ["pydantic.BaseModel", "sqlalchemy.orm.DeclarativeBase"]` and `runtime-evaluated-decorators`; without them the fix breaks FastAPI/SQLAlchemy at runtime | — | `make lint` |
| Exact optional props | `{ a: undefined }` passed where `a?: string` was meant to be absent | — | tsc `exactOptionalPropertyTypes`; measure first, most React apps pay more in `\| undefined` annotations than they gain | `pnpm typecheck` |
| File length | 1,000-line files nobody can review | `ruff` has no rule; add a local hook: `git ls-files '*.py' '*.ts' '*.tsx' \| xargs wc -l \| awk '$1 > 1000 && $2 != "total" {print; bad=1} END {exit bad}'` | same | pre-commit |

## Tier 2: offer when the shape matches

| Shape (from the audit) | Check | Catches | How |
|---|---|---|---|
| Alembic migrations | `uv run alembic check` | models changed without a migration (the drift only shows in production) | CI step after `uv sync`, needs the database service |
| Generated API types (`openapi-typescript`) | regenerate and `git diff --exit-code` | frontend types stale against the API | CI step in `web` after `api` exports the schema; Makefile `types` target |
| OpenAPI schema versioned | export and `git diff --exit-code` | schema file stale against the routes | CI step in `api` |
| Layered Python package (`rules.py` pure, `service.py` orchestrates) | `import-linter` with `[tool.importlinter]` contracts (`type = "forbidden"`: `app.*.rules` may not import `sqlalchemy`, `fastapi`, `app.*.service`) | the functional core importing the shell | `uv run lint-imports` in `make lint` |
| TypeScript packages with entry points | `dependency-cruiser` | imports that reach into a package's internals instead of its entry points | `/mattpocock-skills:setup-ts-deep-modules` installs the rules and proves they bite |
| SPA with lazy areas | bundle budget | critical chunk growing past the budget | `size-limit` or a `check-bundle-size.mjs` reading `dist/` after `vite build`; CI step in `web` |
| Library package | `publint` + `@arethetypeswrong/cli` | broken `exports` map, missing types for a module system | CI step after `pnpm build` |
| Tests with heavy mocking (the audit shows `unittest.mock` / `vi.mock` everywhere) | mutation testing: `mutmut` / `@stryker-mutator/core` | tests that never fail when the code changes, the tautological test by definition | weekly scheduled workflow, never per PR (slow) |
| Web app with real users | Playwright smoke suite (`@smoke` tag) | the deployed stack not answering | `make smoke URL=…` after deploy; `/playwright-expert` writes the tests |
| Shell scripts in `deploy/` | shellcheck already in `lint-infra` | | |
| Multiple services in Compose | `docker compose config --quiet` | invalid compose files, missing env vars | `make lint-infra` |

## What does not go here

Anything that needs judgement (naming in context, whether a module is deep enough, whether a mock hides an error path) belongs in `CODING_STANDARDS.md`, where the review agent reads it. A check that produces false positives the team ignores is worse than no check: when a rule's findings are routinely waived, delete the rule or move it to the standards file.
