<!--
Seed for CODING_STANDARDS.md. Translate to the project's documentation language.
Resolve every "adapt" comment against the project, delete sections that do not apply,
and delete any rule a check (ruff, mypy, Biome, tsc, pytest, Vitest) already enforces.
-->

# Coding standards

This file is read by the **review agent** (`code-review`, `retro`) after implementation, not by the implementer. `AGENTS.md` only points here. Implementation makes it work; review makes it good.

A rule lives here only when it needs judgement. Anything mechanical (a banned API, an import shape, formatting, a file location) is a check in `make check`, and rules the tooling enforces are not repeated here. When a review comment recurs, the retro decides whether it becomes a check or a line in this file: the same comment is never written twice.

Each rule states the rule and the reason. Examples only where the rule is easy to misread.

## Design

- **Deep modules.** A module exposes a small interface and hides a large implementation. A caller gets a lot from one simple call (*leverage*), and related code sits together (*locality*). Several tiny functions that each do little, exported side by side, are a shallow module: merge them behind one entry point.
- **Test through the interface.** Tests call the module's public entry points, never its internals. A test that breaks when a private function is renamed, without any behaviour change, is structure-sensitive and gets rewritten.
- **Functional core, imperative shell.** Business rules are pure functions (no I/O, no clock, no database) tested without fixtures; orchestration (database, HTTP, queues) lives in a thin shell around them. <!-- adapt: in this project the core is `rules.py`, the shell is `service.py`/`router.py` -->
- **One reason to change per module.** A module touched by every unrelated feature (shotgun surgery) or one that changes for several unrelated reasons (divergent change) gets split or merged.
- **Seams are explicit.** Dependencies that tests replace (clock, external APIs, random) are injected at one seam, named for what they do, never patched by module path from inside a test.

## Tests

Three ways a test lies, each a defect to fix in review:

1. **Tautological:** it restates a constant or the implementation (`assert LIMIT == 280`). It can never fail for a real reason. Test the behaviour the constant produces.
2. **Source-text:** it reads the module's source, a template or a snapshot of the code and asserts on strings. Render or execute the thing instead.
3. **Cannot fail:** a dependency is stubbed so completely that its error paths vanish. Prefer the real dependency (a disposable database, an in-memory broker, a recorded HTTP response); when a stub is unavoidable, add the test for the failure mode the stub removed.

Further rules:

- Integration tests run against a real, disposable database, never a mocked session. <!-- adapt: PostgreSQL `<nome>_test` from compose / the CI service -->
- A test's name states the behaviour and the condition (`test_rejects_expired_token`), not the function it calls.
- One behaviour per test; arrange, act, assert, in that order, visible.
- Coverage is a report the team reads, not a target. A test added only to raise the number is removed.
- `xfail`, `skip` and `.only` carry a reason and an issue reference, and `.only` never reaches `main` (the linter blocks it).

## Naming and language

<!-- adapt: this section encodes the team's bilingual convention; delete if the project is monolingual -->

- Domain terms (the ones in `GLOSSARY.md`) use the client's language without accents: `Aplicacao`, `questao_id`, `/api/v1/questionarios`.
- Technical terms use English, as the framework names them: `router`, `settings`, `middleware`, `hooks`, `request_id`, `APP_ENV`. This holds for file, function, variable and constant names, JSON keys, env vars, Makefile targets, CI jobs and log keys.
- A mixed identifier puts the English verb first and the domain noun after: `list_questionarios`, `create_aplicacao`. Domain modules take the domain name (`questionarios/`); technical modules take English names (`core/`, `health/`).
- Comments, docs, commits and PRs use the team's language. Log messages and domain values use the team's language; log keys use English.

## Errors and logging

- Errors that the caller can act on are typed (an exception class or a result type per failure mode), never a bare string or a generic exception.
- Nothing is caught and swallowed: a `try` either recovers with a visible fallback, re-raises with context, or does not exist.
- Logs are one JSON line per event with the agreed keys (`level`, `time`, `message`, `request_id`, `route`, `status`, `duration_ms`). <!-- adapt: delete if the project has no JSON logging -->
- Never logged: request and response bodies, headers, and the masked fields (`password`/`senha`, `token`, `authorization`, `cookie`, `cpf`, `email`, `phone`/`telefone`). A new sensitive field joins the mask list in the same PR that introduces it.
- Tracebacks do not print variable values (`diagnose=False`, `backtrace=False`).

## Configuration

- Configuration comes from environment variables through one typed settings object; code never reads `os.environ` / `process.env` directly elsewhere.
- `.env.example` lists every variable with a fake value; adding a variable without updating it is a review failure.
- Versions come from `git describe`; no hand-maintained version file. <!-- adapt -->

## Backend (Python) <!-- adapt: delete if there is no Python -->

- Each resource is a package with `router.py` (HTTP only), `schemas.py` (Pydantic), `models.py` (SQLAlchemy), `service.py` (orchestration) and, only where there is business logic, `rules.py` (pure). Logic found in a router or a schema validator moves to `rules.py` or `service.py`.
- Migrations are forward-compatible with the previous application version, so an application rollback never needs a database rollback.
- Public functions are typed end to end; `Any` and `type: ignore` carry a comment naming the reason.
- Health endpoint: `GET /api/v1/health`, one key per dependency, `200` only when every dependency is `ok`, `503` otherwise with the same body.

## Frontend (TypeScript) <!-- adapt: delete if there is no frontend -->

- API types come from the generated OpenAPI client, never written by hand; a hand-written mirror of a server type is a review failure.
- Server state lives in TanStack Query (cache, retry, polling); component state holds only UI state.
- Each area (`src/areas/<area>/`) is lazy-loaded and owns its routes; shared code lives in `src/shared/` and never imports from an area.
- No `any`, no non-null assertions (`!`); narrow the type or handle the case.

## Commits and PRs

- Conventional Commits in the team's language, scope = component, issue id at the end: `feat(api): cria o esqueleto da API (DEV-123)`.
- A PR ends with the **merge danger**: one-way or two-way door, and blast radius. A one-way door (migration, data loss, mass email, external side effect) gets a careful human review; a two-way door with a local blast radius gets a light one.
- A PR shows what changes with pseudocode or a diagram before prose.
